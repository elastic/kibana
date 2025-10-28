/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { ToolingLog } from '@kbn/tooling-log';
import type { Client as ESClient } from 'elasticsearch-8.x'; // Switch to `@elastic/elasticsearch` when the CI cluster is upgraded.
import { SCOUT_TEST_EVENTS_DATA_STREAM_NAME } from '@kbn/scout-info';
import type { ScoutReportEvent } from '../event';
import * as componentTemplates from './component_templates';
import * as indexTemplates from './index_templates';

export class ScoutReportDataStream {
  private log: ToolingLog;

  constructor(private es: ESClient, log?: ToolingLog) {
    this.log = log || new ToolingLog();
  }

  async exists() {
    return await this.es.indices.exists({ index: SCOUT_TEST_EVENTS_DATA_STREAM_NAME });
  }

  async initialize() {
    await this.setupComponentTemplates();
    await this.setupIndexTemplate();

    if (await this.exists()) {
      return;
    }

    this.log.info(`Creating data stream '${SCOUT_TEST_EVENTS_DATA_STREAM_NAME}'`);
    await this.es.indices.createDataStream({
      name: SCOUT_TEST_EVENTS_DATA_STREAM_NAME,
    });
  }

  async setupComponentTemplates() {
    for (const template of [
      componentTemplates.buildkiteMappings,
      componentTemplates.reporterMappings,
      componentTemplates.testRunMappings,
      componentTemplates.suiteMappings,
      componentTemplates.testMappings,
    ]) {
      const templateExists = await this.es.cluster.existsComponentTemplate({ name: template.name });
      if (!templateExists) {
        this.log.info(`Creating component template '${template.name}'`);
        await this.es.cluster.putComponentTemplate(template);
        continue;
      }

      // Template exists but might need to be updated
      const newTemplateVersion = template.version || 0;
      const existingTemplateVersion =
        (await this.es.cluster.getComponentTemplate({ name: template.name })).component_templates[0]
          .component_template.version || 0;

      if (existingTemplateVersion >= newTemplateVersion) {
        this.log.info(`Component template '${template.name} exists and is up to date.`);
        continue;
      }

      this.log.info(
        `Updating component template '${template.name}' (version ${existingTemplateVersion} -> ${newTemplateVersion})`
      );
      await this.es.cluster.putComponentTemplate(template);
    }
  }

  async setupIndexTemplate() {
    const template = indexTemplates.testEvents;
    const templateExists: boolean = await this.es.indices.existsIndexTemplate({
      name: template.name,
    });

    if (!templateExists) {
      this.log.info(`Creating index template '${template.name}'`);
      await this.es.indices.putIndexTemplate(template);
      return;
    }

    // Template exists but might need to be updated
    const newTemplateVersion = template.version || 0;
    const existingTemplateVersion =
      (await this.es.indices.getIndexTemplate({ name: template.name })).index_templates[0]
        .index_template.version || 0;

    if (existingTemplateVersion >= newTemplateVersion) {
      this.log.info(`Index template '${template.name} exists and is up to date.`);
      return;
    }

    this.log.info(
      `Updating index template '${template.name}' (version ${existingTemplateVersion} -> ${newTemplateVersion})`
    );
    await this.es.indices.putIndexTemplate(template);
  }

  async addEvent(event: ScoutReportEvent) {
    await this.es.index({ index: SCOUT_TEST_EVENTS_DATA_STREAM_NAME, document: event });
  }

  async addEventsFromFile(...eventLogPaths: string[]) {
    // Normalize the given event log paths to absolute paths
    const paths: string[] = eventLogPaths.map((p) => path.resolve(p));

    const events = async function* (): AsyncGenerator<string> {
      for (const filePath of paths) {
        const lineReader = readline.createInterface({
          input: fs.createReadStream(filePath),
          crlfDelay: Infinity,
        });

        for await (const line of lineReader) {
          yield line;
        }
      }
    };

    this.log.info(
      [
        `Uploading events from ${paths.length} file(s) to data stream '${SCOUT_TEST_EVENTS_DATA_STREAM_NAME}':`,
        ...paths.map((filePath) => `- ${filePath}`),
      ].join('\n')
    );

    const stats = await this.es.helpers.bulk({
      datasource: events(),
      onDocument: () => {
        return { create: { _index: SCOUT_TEST_EVENTS_DATA_STREAM_NAME } };
      },
      refresh: false,
      refreshOnCompletion: false,
    });

    this.log.info(`Uploaded ${stats.total} events in ${stats.time / 1000}s.`);

    if (stats.failed > 0) {
      this.log.warning(`Failed to upload ${stats.failed} events`);
    }
  }
}

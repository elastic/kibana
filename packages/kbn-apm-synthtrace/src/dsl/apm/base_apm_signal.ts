/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Signal } from '../signal';
import { dataStream, WriteTarget } from '../write_target';
import { ApmFields } from './apm_fields';

export interface ApmElasticsearchOutputWriteTargets {
  transaction: string;
  span: string;
  error: string;
  metric: string;
  app_metric: string;
  service_metric: string;
}

export class BaseApmSignal<TFields extends ApmFields> extends Signal<TFields> {
  constructor(fields: TFields) {
    super(fields);
  }

  enrichWithVersionInformation(version: string, versionMajor: number): this {
    this.fields.observer = {
      type: 'synthtrace',
      version: version ?? '8.2.0',
      version_major: versionMajor,
    };
    return this;
  }

  toDocument(): Record<string, any> {
    const document = this.fields;
    document['ecs.version'] = '1.4';
    document['service.node.name'] =
      document['service.node.name'] || document['container.id'] || document['host.name'];

    // TODO document why we do this
    if (document['processor.event'] !== 'metric') {
      document['timestamp.us'] = document['@timestamp']! * 1000;
    }
    const newDoc = super.toDocument();
    if (typeof newDoc['@timestamp'] === 'number') {
      const timestamp = newDoc['@timestamp'];
      newDoc['@timestamp'] = new Date(timestamp).toISOString();
    }
    return newDoc;
  }

  public static EventTypeMapping: ApmElasticsearchOutputWriteTargets = {
    transaction: 'traces-apm-default',
    span: 'traces-apm-default',
    metric: 'metrics-apm.internal-default',
    app_metric: 'metrics-apm.app-default',
    error: 'logs-apm.error-default',
    service_metric: 'metrics-apm.service-default',
  };

  public static WriteTargets: WriteTarget[] = Object.values(BaseApmSignal.EventTypeMapping).map(
    (t) => dataStream(t)
  );

  public getWriteTarget(): WriteTarget | undefined {
    const f = this.fields;
    if (!f['processor.event']) {
      throw Error("'processor.event' is not set on document, can not determine target index");
    }
    const eventType = f['processor.event'] as keyof ApmElasticsearchOutputWriteTargets;
    let target = BaseApmSignal.EventTypeMapping[eventType];
    if (eventType === 'metric') {
      if (f['metricset.name'] === 'agent_config') {
        target = 'metrics-apm.internal-default';
      } else if (!f['service.name']) {
        target = 'metrics-apm.app-default';
      } else {
        if (!Object.keys(f).find((k) => k.startsWith('transaction.') || k.startsWith('span.'))) {
          target = 'metrics-apm.app-default';
        }
      }
    }
    return dataStream(target);
  }
}

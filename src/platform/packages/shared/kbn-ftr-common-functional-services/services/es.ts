/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import { omit } from 'lodash';
import { systemIndicesSuperuser, createEsClientForFtrConfig } from '@kbn/test';
import { castArray } from 'lodash';
import pLimit from 'p-limit';
import type { IndicesPutIndexTemplateRequest } from '@elastic/elasticsearch/lib/api/types';
import type { FtrProviderContext } from './ftr_provider_context';

export async function EsProvider({ getService }: FtrProviderContext): Promise<Client> {
  const config = getService('config');
  const isServerless = !!config.get('serverless');

  const lifecycle = getService('lifecycle');

  const client = createEsClientForFtrConfig(
    config,
    isServerless
      ? {}
      : {
          // Use system indices user so tests can write to system indices
          authOverride: systemIndicesSuperuser,
        }
  );

  const idxPatterns = [
    '.kibana*',
    '.internal*',
    'logs*',
    'metrics*',
    'traces*',
    'filebeat*',
    'metricbeat*',
  ];

  const REFRESH_INTERVAL = '1ms';

  function wrap<T, U extends keyof T>(obj: T, prop: U, cb: (m: T[U]) => T[U]) {
    const original = obj[prop];
    obj[prop] = cb(original);
  }

  await client.cluster.putComponentTemplate({
    name: 'fast_refresh',
    template: {
      settings: {
        refresh_interval: REFRESH_INTERVAL,
      },
    },
  });

  async function putFastRefreshSettings() {
    await client.indices.putSettings({
      index: idxPatterns,
      allow_no_indices: true,
      expand_wildcards: ['all'],
      settings: {
        index: {
          refresh_interval: REFRESH_INTERVAL,
        },
      },
    });
  }

  const { index_templates: idxTemplates } = await client.indices.getIndexTemplate({
    name: '*',
  });

  const limiter = pLimit(10);

  await Promise.all(
    idxTemplates.map(async (tpl) => {
      const next = {
        name: tpl.name,
        ...omit(tpl.index_template, 'created_date_millis', 'modified_date_millis', 'version'),
        ignore_missing_component_templates: castArray(
          tpl.index_template.ignore_missing_component_templates ?? []
        ),
      };

      // there are some templates where the priority is higher than ES' parser supports
      if (next.priority && next.priority >= Number.MAX_SAFE_INTEGER) {
        return;
      }

      await limiter(() => client.indices.putIndexTemplate(next));
    })
  );

  // Wrap putIndexTemplate to always include 'fast_refresh' in composed_of
  // @ts-expect-error
  wrap(client.indices, 'putIndexTemplate', function putIndexTemplate(originalPutIndexTemplate) {
    return function (indexTemplateRequest, options) {
      const nextRequest: IndicesPutIndexTemplateRequest = {
        ...indexTemplateRequest,
        template: {
          ...indexTemplateRequest.template,
          settings: {
            ...indexTemplateRequest.template?.settings,
            refresh_interval: REFRESH_INTERVAL,
          },
        },
      };

      // Call original with both arguments to preserve signature
      return originalPutIndexTemplate.call(this, nextRequest, options);
    };
  });

  lifecycle.beforeTests.add(async () => {
    await putFastRefreshSettings();
  });

  return client;
}

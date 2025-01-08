/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { mappings } from './mappings';

export interface NewIndexTemplateRequestParams {
  name: string;
  indexPatterns: string[];
  kibanaVersion: string;
}

export const newIndexTemplateRequest = (
  params: NewIndexTemplateRequestParams
): estypes.IndicesPutIndexTemplateRequest => {
  const version = 1;
  const { name, indexPatterns, kibanaVersion } = params;

  return {
    name,
    // This will create the template only if it doesn't exist.
    create: true,
    // This object is required to make it a data stream template.
    data_stream: {
      hidden: true,
    },
    // Our own metadata to keep track of the template.
    _meta: {
      description: 'This data stream stores events for the Kibana content_management plugin.',
      // Template version.
      version,
      // Kibana version when the template was created.
      kibanaVersion,
    },
    // Setting this to something higher than the default 0 will allow
    // to define lower priority templates in the future.
    priority: 50,
    version,
    index_patterns: indexPatterns,
    template: {
      settings: {
        number_of_shards: 1,
        auto_expand_replicas: '0-1',
        'index.hidden': true,
      },
      mappings,
    },
  };
};

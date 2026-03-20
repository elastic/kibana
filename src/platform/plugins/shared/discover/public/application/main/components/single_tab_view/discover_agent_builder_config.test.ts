/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AttachmentType } from '@kbn/agent-builder-common/attachments';
import {
  buildDiscoverQuery,
  buildDiscoverScreenContextAttachment,
} from './discover_agent_builder_config';

describe('buildDiscoverQuery', () => {
  it('preserves ES|QL mode when updating the query', () => {
    expect(
      buildDiscoverQuery({
        currentQuery: { esql: 'from logs-* | limit 10' },
        nextQuery: 'from metrics-* | limit 5',
      })
    ).toEqual({ esql: 'from metrics-* | limit 5' });
  });

  it('preserves the current KQL language when a new language is not provided', () => {
    expect(
      buildDiscoverQuery({
        currentQuery: { language: 'kuery', query: 'host.name:"web-01"' },
        nextQuery: 'service.name:"checkout"',
      })
    ).toEqual({ language: 'kuery', query: 'service.name:"checkout"' });
  });

  it('allows switching between KQL and Lucene for non-ES|QL tabs', () => {
    expect(
      buildDiscoverQuery({
        currentQuery: { language: 'kuery', query: 'host.name:"web-01"' },
        nextLanguage: 'lucene',
        nextQuery: 'host.name:web-01',
      })
    ).toEqual({ language: 'lucene', query: 'host.name:web-01' });
  });
});

describe('buildDiscoverScreenContextAttachment', () => {
  it('builds a hidden screen context attachment with discover tab details', () => {
    expect(
      buildDiscoverScreenContextAttachment({
        appFiltersCount: 2,
        columns: ['@timestamp', 'message'],
        dataSourceType: 'dataView',
        dataViewTitle: 'logs-*',
        globalFiltersCount: 1,
        query: { language: 'kuery', query: 'service.name:"checkout"' },
        sort: [['@timestamp', 'desc']],
        timeRange: { from: 'now-15m', to: 'now' },
        url: 'http://localhost:5601/app/discover#/',
      })
    ).toEqual({
      hidden: true,
      type: AttachmentType.screenContext,
      data: {
        app: 'discover',
        url: 'http://localhost:5601/app/discover#/',
        description: 'The user is viewing a Discover tab for data view logs-* in kuery mode.',
        time_range: { from: 'now-15m', to: 'now' },
        additional_data: {
          app_filters_count: '2',
          columns: '["@timestamp","message"]',
          data_source_type: 'dataView',
          data_view: 'logs-*',
          global_filters_count: '1',
          query: 'service.name:"checkout"',
          query_language: 'kuery',
          sort: '[["@timestamp","desc"]]',
        },
      },
    });
  });
});

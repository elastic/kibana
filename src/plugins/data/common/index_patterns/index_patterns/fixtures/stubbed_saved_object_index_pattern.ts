/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

// @ts-expect-error
import stubbedLogstashFields from './logstash_fields';

const mockLogstashFields = stubbedLogstashFields();

export const mockPatternLists = {
  patternListActive: ['auditbeat-*', 'filebeat-*', 'packetbeat-*', 'winlogbeat-*'],
  patternList: [
    'apm-*-transaction*',
    'auditbeat-*',
    'endgame-*',
    'filebeat-*',
    'packetbeat-*',
    'winlogbeat-*',
  ],
};

export function stubbedSavedObjectIndexPattern(id: string | null = null) {
  return {
    id,
    type: 'index-pattern',
    attributes: {
      timeFieldName: 'timestamp',
      customFormats: {},
      fields: mockLogstashFields,
      title: 'title',
      patternList: mockPatternLists.patternList,
    },
    version: '2',
  };
}

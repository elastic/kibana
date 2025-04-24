/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { replaceTemplateStrings } from './replace_template_strings';
import { getServices } from '../../kibana_services';

jest.mock('../../kibana_services', () => ({
  getServices: jest.fn(),
}));

describe('replaceTemplateStrings', () => {
  beforeEach(() => {
    (getServices as jest.Mock).mockReturnValue({
      tutorialService: {
        getVariables: jest.fn().mockReturnValue({
          someVariable: 'someValue',
        }),
      },
      kibanaVersion: '8.0.0',
      docLinks: {
        ELASTIC_WEBSITE_URL: 'https://www.elastic.co/',
        DOC_LINK_VERSION: '8.0',
        links: {
          filebeat: { base: 'https://www.elastic.co/guide/en/beats/filebeat/current/index.html' },
          metricbeat: {
            base: 'https://www.elastic.co/guide/en/beats/metricbeat/current/index.html',
          },
          heartbeat: { base: 'https://www.elastic.co/guide/en/beats/heartbeat/current/index.html' },
          winlogbeat: {
            base: 'https://www.elastic.co/guide/en/beats/winlogbeat/current/index.html',
          },
          auditbeat: { base: 'https://www.elastic.co/guide/en/beats/auditbeat/current/index.html' },
          logstash: { base: 'https://www.elastic.co/guide/en/logstash/current/index.html' },
        },
      },
    });
  });
  describe('should replace template strings with:', () => {
    test('provided variables', () => {
      const text = 'Kibana version: {config.kibana.version}';
      const result = replaceTemplateStrings(text);
      expect(result).toBe('Kibana version: 8.0.0');
    });

    test('doc links', () => {
      const text = 'Filebeat docs: {config.docs.beats.filebeat}';
      const result = replaceTemplateStrings(text);
      expect(result).toBe(
        'Filebeat docs: https://www.elastic.co/guide/en/beats/filebeat/current/index.html'
      );
    });
  });

  test('should handle {curlyOpen} {curlyClose} correctly', () => {
    const text = 'Curly braces: {curlyOpen}escaped{curlyClose}';
    const result = replaceTemplateStrings(text);
    expect(result).toBe('Curly braces: {escaped}');
  });

  test('should handle unknown variables gracefully', () => {
    const text = 'Unknown variable: {config.unknown}';
    const result = replaceTemplateStrings(text);
    expect(result).toBe('Unknown variable: ');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getMappingConflictsInfo } from '.';

describe('Helpers', () => {
  describe('getMappingConflictsInfo', () => {
    test('it return null if there are not conflicts', () => {
      const field = {
        name: 'field1',
        type: 'string',
      };
      const conflictsInfo = getMappingConflictsInfo(field);

      expect(conflictsInfo).toBeNull();
    });
    test('it groups ".ds-" data stream indices', () => {
      const field = {
        name: 'field1',
        type: 'conflict',
        conflictDescriptions: {
          text: [
            '.ds-logs-default-2023.01.18-000001',
            '.ds-logs-default-2023.01.18-000002',
            '.ds-logs-tortilla.process-default-2022.11.20-000011',
            '.ds-logs-tortilla.process-default-2022.11.20-000012',
            '.ds-logs-tortilla.process-default-2022.11.20-000016',
          ],
          long: [
            '.ds-logs-default-2023.01.18-000004',
            '.ds-logs-default-2023.01.18-000005',
            'partial-.ds-logs-gcp.audit-2021.12.22-000240',
            'partial-.ds-logs-gcp.audit-2021.12.22-000242',
          ],
        },
      };
      const conflictsInfo = getMappingConflictsInfo(field);

      expect(conflictsInfo).toEqual([
        {
          type: 'text',
          totalIndexCount: 5,
          groupedIndices: [
            { name: 'logs-tortilla.process-default', count: 3 },
            { name: 'logs-default', count: 2 },
          ],
        },
        {
          type: 'long',
          totalIndexCount: 4,
          groupedIndices: [
            { name: 'logs-default', count: 2 },
            { name: 'logs-gcp.audit', count: 2 },
          ],
        },
      ]);
    });
    test('it groups old ".siem-" indices', () => {
      const field = {
        name: 'field1',
        type: 'conflict',
        conflictDescriptions: {
          text: [
            '.siem-signals-default-000001',
            '.siem-signals-default-000002',
            '.siem-signals-default-000011',
            '.siem-signals-default-000012',
          ],
          unmapped: [
            '.siem-signals-default-000004',
            '.siem-signals-default-000005',
            '.siem-signals-default-000240',
          ],
        },
      };
      const conflictsInfo = getMappingConflictsInfo(field);

      expect(conflictsInfo).toEqual([
        {
          type: 'text',
          totalIndexCount: 4,
          groupedIndices: [{ name: '.siem-signals-default', count: 4 }],
        },
        {
          type: 'unmapped',
          totalIndexCount: 3,
          groupedIndices: [{ name: '.siem-signals-default', count: 3 }],
        },
      ]);
    });
    test('it groups mixed indices', () => {
      const field = {
        name: 'field1',
        type: 'conflict',
        conflictDescriptions: {
          boolean: [
            '.ds-logs-default-2023.01.18-000001',
            '.ds-logs-tortilla.process-default-2022.11.20-000011',
            '.ds-logs-tortilla.process-default-2022.11.20-000012',
            '.ds-logs-tortilla.process-default-2022.11.20-000016',
            '.siem-signals-default-000001',
            '.siem-signals-default-000002',
            '.siem-signals-default-000012',
            'my-own-index-1',
            'my-own-index-2',
          ],
          unmapped: [
            '.siem-signals-default-000004',
            'partial-.ds-logs-gcp.audit-2021.12.22-000240',
            'partial-.ds-logs-gcp.audit-2021.12.22-000242',
            'my-own-index-3',
          ],
        },
      };
      const conflictsInfo = getMappingConflictsInfo(field);

      expect(conflictsInfo).toEqual([
        {
          type: 'boolean',
          totalIndexCount: 9,
          groupedIndices: [
            { name: 'logs-tortilla.process-default', count: 3 },
            { name: '.siem-signals-default', count: 3 },
            { name: 'logs-default', count: 1 },
            { name: 'my-own-index-1', count: 1 },
            { name: 'my-own-index-2', count: 1 },
          ],
        },
        {
          type: 'unmapped',
          totalIndexCount: 4,
          groupedIndices: [
            { name: 'logs-gcp.audit', count: 2 },
            { name: '.siem-signals-default', count: 1 },
            { name: 'my-own-index-3', count: 1 },
          ],
        },
      ]);
    });
  });
});

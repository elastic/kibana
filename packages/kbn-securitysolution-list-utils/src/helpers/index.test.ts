/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  getMappingConflictsInfo,
  fieldSupportsMatches,
  hasWrongOperatorWithWildcard,
  hasPartialCodeSignatureEntry,
} from '.';

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

  describe('fieldSupportsMatches', () => {
    test('it returns true if esTypes is keyword', () => {
      expect(
        fieldSupportsMatches({ name: 'field', type: 'conflict', esTypes: ['keyword'] })
      ).toBeTruthy();
    });

    test('it returns true if one of the esTypes is kibana type string and another is not', () => {
      expect(
        fieldSupportsMatches({ name: 'field', type: 'conflict', esTypes: ['keyword', 'object'] })
      ).toBeTruthy();
    });

    test('it returns true if one of the esTypes is keyword', () => {
      expect(
        fieldSupportsMatches({ name: 'field', type: 'conflict', esTypes: ['keyword', 'unmapped'] })
      ).toBeTruthy();
    });

    test('it returns true if one of the esTypes is text', () => {
      expect(
        fieldSupportsMatches({ name: 'field', type: 'conflict', esTypes: ['text', 'unmapped'] })
      ).toBeTruthy();
    });

    test('it returns true if all of the esTypes is map to kibana type string', () => {
      expect(
        fieldSupportsMatches({ name: 'field', type: 'conflict', esTypes: ['text', 'keyword'] })
      ).toBeTruthy();
    });

    test('it returns false if none of the esTypes map to kibana type string', () => {
      expect(
        fieldSupportsMatches({ name: 'field', type: 'conflict', esTypes: ['bool', 'unmapped'] })
      ).toBeFalsy();
    });
  });
  describe('hasWrongOperatorWithWildcard', () => {
    test('it returns true if there is at least one exception entry with a wildcard and the wrong operator', () => {
      expect(
        hasWrongOperatorWithWildcard([
          {
            description: '',
            name: '',
            type: 'simple',
            entries: [{ type: 'match', value: 'withwildcard*', field: '', operator: 'included' }],
          },
        ])
      ).toBeTruthy();
      expect(
        hasWrongOperatorWithWildcard([
          {
            description: '',
            name: '',
            type: 'simple',
            entries: [{ type: 'match', value: 'withwildcard?', field: '', operator: 'included' }],
          },
        ])
      ).toBeTruthy();
    });

    test('it returns true if there are entries joined with an OR that have a wildcard and the wrong operator', () => {
      expect(
        hasWrongOperatorWithWildcard([
          {
            description: '',
            name: '',
            type: 'simple',
            entries: [{ type: 'match', value: 'withwildcard?', field: '', operator: 'included' }],
          },
          {
            description: '',
            name: '',
            type: 'simple',
            entries: [{ type: 'match', value: 'withwildcard?*', field: '', operator: 'included' }],
          },
        ])
      ).toBeTruthy();
    });

    test('it returns false if there are no exception entries with a wildcard and the wrong operator', () => {
      expect(
        hasWrongOperatorWithWildcard([
          {
            description: '',
            name: '',
            type: 'simple',
            entries: [
              { type: 'match', value: 'nowildcard', field: '', operator: 'excluded' },
              { type: 'wildcard', value: 'withwildcard*?', field: '', operator: 'included' },
            ],
          },
        ])
      ).toBeFalsy();
    });

    test('it returns true if there are nested entries with a wildcard and the wrong operator', () => {
      expect(
        hasWrongOperatorWithWildcard([
          {
            description: '',
            name: '',
            type: 'simple',
            entries: [
              { type: 'match', value: 'nowildcard', field: '', operator: 'excluded' },
              {
                field: '',
                type: 'nested',
                entries: [{ type: 'match', value: 'wildcard?', field: '', operator: 'excluded' }],
              },
            ],
          },
        ])
      ).toBeTruthy();
    });
  });

  describe('hasPartialCodeSignatureEntry', () => {
    it('returns false if the entry has neither code signature subject name nor trusted field', () => {
      expect(
        hasPartialCodeSignatureEntry([
          {
            description: '',
            name: '',
            type: 'simple',
            os_types: ['windows'],
            entries: [{ type: 'match', value: 'asdf', field: 'someField', operator: 'excluded' }],
          },
        ])
      ).toBeFalsy();
    });
    it('returns true if the entry has code signature subject name but not trusted field', () => {
      expect(
        hasPartialCodeSignatureEntry([
          {
            description: '',
            name: '',
            type: 'simple',
            os_types: ['windows'],
            entries: [
              {
                type: 'match',
                value: 'asdf',
                field: 'process.code_signature.subject_name',
                operator: 'excluded',
              },
            ],
          },
        ])
      ).toBeTruthy();
    });
    it('returns true if the entry has code signature trusted but not the subject name field', () => {
      expect(
        hasPartialCodeSignatureEntry([
          {
            description: '',
            name: '',
            type: 'simple',
            os_types: ['windows'],
            entries: [
              {
                type: 'match',
                value: 'asdf',
                field: 'process.code_signature.trusted',
                operator: 'excluded',
              },
            ],
          },
        ])
      ).toBeTruthy();
    });
    it('returns false if the entry has both code signature subject name and trusted field', () => {
      expect(
        hasPartialCodeSignatureEntry([
          {
            description: '',
            name: '',
            type: 'simple',
            os_types: ['windows'],
            entries: [
              {
                type: 'match',
                value: 'asdf',
                field: 'process.code_signature.subject_name',
                operator: 'excluded',
              },
              {
                type: 'match',
                value: 'true',
                field: 'process.code_signature.trusted',
                operator: 'excluded',
              },
            ],
          },
        ])
      ).toBeFalsy();
    });
    it('returns false if the entry has both code signature team_id and trusted fields for mac os', () => {
      expect(
        hasPartialCodeSignatureEntry([
          {
            description: '',
            name: '',
            type: 'simple',
            os_types: ['macos'],
            entries: [
              {
                type: 'match',
                value: 'asdf',
                field: 'process.code_signature.team_id',
                operator: 'excluded',
              },
              {
                type: 'match',
                value: 'true',
                field: 'process.code_signature.trusted',
                operator: 'excluded',
              },
            ],
          },
        ])
      ).toBeFalsy();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { injectMetadataFields } from './inject_metadata_fields';

describe('injectMetadataFields', () => {
  describe('single field (_id) — parity with Security injectMetadataId', () => {
    describe('METADATA injection into FROM', () => {
      it('injects METADATA when FROM has no metadata', () => {
        expect(injectMetadataFields('FROM logs*', ['_id'])).toBe('FROM logs* METADATA _id');
      });

      it('preserves query when field already exists', () => {
        expect(injectMetadataFields('FROM logs* METADATA _id', ['_id'])).toBe(
          'FROM logs* METADATA _id'
        );
      });

      it('preserves query when field exists with other fields', () => {
        expect(injectMetadataFields('FROM logs* METADATA _id, _version, _index', ['_id'])).toBe(
          'FROM logs* METADATA _id, _version, _index'
        );
      });

      it('appends field when METADATA exists without it', () => {
        expect(injectMetadataFields('FROM logs* METADATA _index', ['_id'])).toBe(
          'FROM logs* METADATA _index, _id'
        );
      });

      it('injects METADATA with multiple source indices', () => {
        expect(injectMetadataFields('FROM logs*, other-index*', ['_id'])).toBe(
          'FROM logs*, other-index* METADATA _id'
        );
      });

      it('injects METADATA before pipe commands', () => {
        expect(injectMetadataFields('FROM logs* | WHERE x > 5', ['_id'])).toBe(
          'FROM logs* METADATA _id | WHERE x > 5'
        );
      });

      it('handles trailing whitespace', () => {
        expect(injectMetadataFields('FROM logs*  ', ['_id'])).toBe('FROM logs* METADATA _id');
      });

      it('handles multi-line query', () => {
        expect(injectMetadataFields('FROM packetbeat*\n        | LIMIT 100', ['_id'])).toBe(
          'FROM packetbeat* METADATA _id | LIMIT 100'
        );
      });
    });

    describe('KEEP best-effort fix', () => {
      it('adds field to KEEP when missing', () => {
        expect(injectMetadataFields('FROM logs* METADATA _id | KEEP agent.name', ['_id'])).toBe(
          'FROM logs* METADATA _id | KEEP agent.name, _id'
        );
      });

      it('does not add field to KEEP when already present', () => {
        expect(
          injectMetadataFields('FROM logs* METADATA _id | KEEP agent.name, _id', ['_id'])
        ).toBe('FROM logs* METADATA _id | KEEP agent.name, _id');
      });

      it('adds field to KEEP with partial wildcard', () => {
        expect(injectMetadataFields('FROM logs* | KEEP agent.*', ['_id'])).toBe(
          'FROM logs* METADATA _id | KEEP agent.*, _id'
        );
      });

      it('handles KEEP followed by other commands', () => {
        expect(injectMetadataFields('FROM logs* | KEEP a, b | EVAL c = a', ['_id'])).toBe(
          'FROM logs* METADATA _id | KEEP a, b, _id | EVAL c = a'
        );
      });

      it('handles KEEP with field already present and no METADATA', () => {
        expect(injectMetadataFields('FROM logs* | KEEP agent.name, _id', ['_id'])).toBe(
          'FROM logs* METADATA _id | KEEP agent.name, _id'
        );
      });
    });

    describe('DROP (accepted limitation)', () => {
      it('does not modify DROP — accepted limitation', () => {
        expect(injectMetadataFields('FROM logs* | DROP _id', ['_id'])).toBe(
          'FROM logs* METADATA _id | DROP _id'
        );
      });

      it('injects METADATA but does not remove explicit DROP', () => {
        expect(injectMetadataFields('FROM logs* METADATA _id | DROP _id', ['_id'])).toBe(
          'FROM logs* METADATA _id | DROP _id'
        );
      });

      it('does not inject field into KEEP that appears after DROP', () => {
        expect(injectMetadataFields('FROM logs* | DROP _id | KEEP agent.name', ['_id'])).toBe(
          'FROM logs* METADATA _id | DROP _id | KEEP agent.name'
        );
      });

      it('injects field into KEEP that appears before DROP', () => {
        expect(injectMetadataFields('FROM logs* | KEEP agent.name | DROP _id', ['_id'])).toBe(
          'FROM logs* METADATA _id | KEEP agent.name, _id | DROP _id'
        );
      });

      it('DROP multiple fields including target stops KEEP injection downstream', () => {
        expect(injectMetadataFields('FROM logs* | DROP _id, agent.type | KEEP host', ['_id'])).toBe(
          'FROM logs* METADATA _id | DROP _id, agent.type | KEEP host'
        );
      });

      it('DROP without target does not affect KEEP injection', () => {
        expect(
          injectMetadataFields('FROM logs* | DROP agent.type | KEEP agent.name', ['_id'])
        ).toBe('FROM logs* METADATA _id | DROP agent.type | KEEP agent.name, _id');
      });

      it('DROP with wildcard _* stops KEEP injection', () => {
        expect(injectMetadataFields('FROM logs* | DROP _* | KEEP agent.name', ['_id'])).toBe(
          'FROM logs* METADATA _id | DROP _* | KEEP agent.name'
        );
      });

      it('DROP with global wildcard * stops KEEP injection', () => {
        expect(injectMetadataFields('FROM logs* | DROP * | KEEP agent.name', ['_id'])).toBe(
          'FROM logs* METADATA _id | DROP * | KEEP agent.name'
        );
      });
    });

    describe('RENAME (stops KEEP injection)', () => {
      it('does not inject field into KEEP after RENAME', () => {
        expect(
          injectMetadataFields('FROM logs* | RENAME _id AS doc_id | KEEP agent.name', ['_id'])
        ).toBe('FROM logs* METADATA _id | RENAME _id AS doc_id | KEEP agent.name');
      });

      it('injects field into KEEP before RENAME', () => {
        expect(
          injectMetadataFields('FROM logs* | KEEP agent.name | RENAME _id AS doc_id', ['_id'])
        ).toBe('FROM logs* METADATA _id | KEEP agent.name, _id | RENAME _id AS doc_id');
      });

      it('RENAME of a different column does not affect KEEP injection', () => {
        expect(
          injectMetadataFields('FROM logs* | RENAME host AS hostname | KEEP hostname', ['_id'])
        ).toBe('FROM logs* METADATA _id | RENAME host AS hostname | KEEP hostname, _id');
      });

      it('RENAME mid-pipeline stops injection for downstream KEEP', () => {
        expect(
          injectMetadataFields('FROM logs* | KEEP a, _id | RENAME _id AS my_id | KEEP a, my_id', [
            '_id',
          ])
        ).toBe('FROM logs* METADATA _id | KEEP a, _id | RENAME _id AS my_id | KEEP a, my_id');
      });

      it('RENAME other_col AS target does NOT stop KEEP injection', () => {
        expect(
          injectMetadataFields('FROM logs* | RENAME doc_id AS _id | KEEP agent.name', ['_id'])
        ).toBe('FROM logs* METADATA _id | RENAME doc_id AS _id | KEEP agent.name, _id');
      });
    });

    describe('EVAL (stops KEEP injection)', () => {
      it('does not inject field into KEEP after EVAL assignment', () => {
        expect(
          injectMetadataFields('FROM logs* | EVAL _id = "overwritten" | KEEP agent.name', ['_id'])
        ).toBe('FROM logs* METADATA _id | EVAL _id = "overwritten" | KEEP agent.name');
      });

      it('injects field into KEEP before EVAL assignment', () => {
        expect(
          injectMetadataFields('FROM logs* | KEEP agent.name | EVAL _id = "overwritten"', ['_id'])
        ).toBe('FROM logs* METADATA _id | KEEP agent.name, _id | EVAL _id = "overwritten"');
      });

      it('EVAL of a different column does not affect KEEP injection', () => {
        expect(injectMetadataFields('FROM logs* | EVAL x = 1 | KEEP x', ['_id'])).toBe(
          'FROM logs* METADATA _id | EVAL x = 1 | KEEP x, _id'
        );
      });

      it('EVAL mid-pipeline stops injection for downstream KEEP', () => {
        expect(
          injectMetadataFields('FROM logs* | KEEP a, _id | EVAL _id = "test" | KEEP a, _id', [
            '_id',
          ])
        ).toBe('FROM logs* METADATA _id | KEEP a, _id | EVAL _id = "test" | KEEP a, _id');
      });
    });

    describe('DISSECT/GROK (does not stop KEEP injection)', () => {
      it('injects field into KEEP after DISSECT', () => {
        expect(
          injectMetadataFields('FROM logs* | DISSECT message "%{parsed}" | KEEP parsed', ['_id'])
        ).toBe('FROM logs* METADATA _id | DISSECT message "%{parsed}" | KEEP parsed, _id');
      });

      it('injects field into KEEP after GROK', () => {
        expect(
          injectMetadataFields('FROM logs* | GROK message "%{WORD:parsed}" | KEEP parsed', ['_id'])
        ).toBe('FROM logs* METADATA _id | GROK message "%{WORD:parsed}" | KEEP parsed, _id');
      });

      it('injects field into KEEP before DISSECT', () => {
        expect(
          injectMetadataFields('FROM logs* | KEEP agent.name | DISSECT message "%{parsed}"', [
            '_id',
          ])
        ).toBe('FROM logs* METADATA _id | KEEP agent.name, _id | DISSECT message "%{parsed}"');
      });
    });

    describe('KEEP with wildcards', () => {
      it('adds field to KEEP * (redundant but harmless)', () => {
        expect(injectMetadataFields('FROM logs* | KEEP *', ['_id'])).toBe(
          'FROM logs* METADATA _id | KEEP *, _id'
        );
      });

      it('adds field to KEEP _* (redundant but harmless)', () => {
        expect(injectMetadataFields('FROM logs* | KEEP _*', ['_id'])).toBe(
          'FROM logs* METADATA _id | KEEP _*, _id'
        );
      });
    });

    describe('multiple KEEP commands', () => {
      it('injects field into both KEEP commands', () => {
        expect(injectMetadataFields('FROM logs* | KEEP a, b | KEEP a', ['_id'])).toBe(
          'FROM logs* METADATA _id | KEEP a, b, _id | KEEP a, _id'
        );
      });
    });

    describe('lowercase commands', () => {
      it('normalizes lowercase commands to uppercase in output', () => {
        expect(
          injectMetadataFields(
            'from logs* metadata _index | where x > 5 | keep agent.name | limit 10',
            ['_id']
          )
        ).toBe('FROM logs* METADATA _index, _id | WHERE x > 5 | KEEP agent.name, _id | LIMIT 10');
      });
    });
  });

  describe('multiple fields (_id + _index) — Discover use case', () => {
    it('adds both fields when no METADATA clause exists', () => {
      expect(injectMetadataFields('FROM logs-*', ['_id', '_index'])).toBe(
        'FROM logs-* METADATA _id, _index'
      );
    });

    it('adds only missing fields when some already present', () => {
      expect(injectMetadataFields('FROM logs-* METADATA _id | LIMIT 20', ['_id', '_index'])).toBe(
        'FROM logs-* METADATA _id, _index | LIMIT 20'
      );
    });

    it('does not duplicate when all requested fields already present', () => {
      const query = 'FROM logs-* METADATA _id, _index | LIMIT 20';
      expect(injectMetadataFields(query, ['_id', '_index'])).toBe(query);
    });

    it('preserves existing extra metadata fields', () => {
      expect(
        injectMetadataFields('FROM logs-* METADATA _ignored | LIMIT 20', ['_id', '_index'])
      ).toBe('FROM logs-* METADATA _ignored, _id, _index | LIMIT 20');
    });

    it('adds both fields to KEEP when missing', () => {
      expect(
        injectMetadataFields('FROM logs-* | KEEP @timestamp, message', ['_id', '_index'])
      ).toBe('FROM logs-* METADATA _id, _index | KEEP @timestamp, message, _id, _index');
    });

    it('handles independent DROP/RENAME/EVAL per field', () => {
      const result = injectMetadataFields('FROM logs-* | DROP _id | KEEP @timestamp', [
        '_id',
        '_index',
      ]);
      expect(result).toContain('METADATA _id, _index');
      expect(result).toContain('KEEP @timestamp, _index');
      expect(result).not.toMatch(/KEEP.*_id/);
    });

    it('does not modify queries without FROM', () => {
      expect(injectMetadataFields('ROW a = 1', ['_id', '_index'])).not.toContain('METADATA');
    });

    it('handles malformed input without crashing', () => {
      expect(() => injectMetadataFields('NOT VALID ESQL {{{}}}', ['_id'])).not.toThrow();
    });
  });
});

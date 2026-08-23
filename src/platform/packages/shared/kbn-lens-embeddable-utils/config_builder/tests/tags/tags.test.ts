/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LensConfigBuilder } from '../../config_builder';
import { simpleMetricAttributes } from '../metric/lens_state_config.mock';
import { singleMetricESQLDatatableAttributes } from '../datatable/lens_state_config_esql.mock';

/**
 * Tag references are stored in the saved-object `references` array as
 * `{ type: 'tag', id, name: 'tag-ref-<id>' }` entries. The API wire format
 * encodes them as a plain `tags: string[]` array on the chart config (same
 * pattern used by dashboard, discover, and links). These tests verify that
 * the encoding (`toAPIFormat`) and decoding (`fromAPIFormat`) round-trip
 * correctly so that tags are not silently dropped when the `lens.apiFormat`
 * feature flag is enabled.
 */
describe('Tag references round-trip', () => {
  const builder = new LensConfigBuilder(undefined, true);

  const TAG_ID_A = 'tag-id-aaa';
  const TAG_ID_B = 'tag-id-bbb';

  const tagRefA = { type: 'tag', id: TAG_ID_A, name: `tag-ref-${TAG_ID_A}` };
  const tagRefB = { type: 'tag', id: TAG_ID_B, name: `tag-ref-${TAG_ID_B}` };

  describe('toAPIFormat', () => {
    it('omits `tags` when there are no tag references', () => {
      const api = builder.toAPIFormat(simpleMetricAttributes);
      expect(api).not.toHaveProperty('tags');
    });

    it('includes `tags` as an array of IDs when tag references are present', () => {
      const attributes = {
        ...simpleMetricAttributes,
        references: [...simpleMetricAttributes.references, tagRefA, tagRefB],
      };
      const api = builder.toAPIFormat(attributes);
      expect(api).toHaveProperty('tags', [TAG_ID_A, TAG_ID_B]);
    });

    it('includes only tag IDs, not other reference types', () => {
      const attributes = {
        ...simpleMetricAttributes,
        references: [...simpleMetricAttributes.references, tagRefA],
      };
      const api = builder.toAPIFormat(attributes);
      // index-pattern references must not appear in tags
      expect((api as { tags?: string[] }).tags).toEqual([TAG_ID_A]);
    });
  });

  describe('fromAPIFormat', () => {
    it('converts `tags` back to saved-object references', () => {
      const api = builder.toAPIFormat({
        ...simpleMetricAttributes,
        references: [...simpleMetricAttributes.references, tagRefA],
      });
      const result = builder.fromAPIFormat(api);
      expect(result.references).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: 'tag', id: TAG_ID_A })])
      );
    });

    it('strips `tags` from the chart-level state after converting', () => {
      const api = builder.toAPIFormat({
        ...simpleMetricAttributes,
        references: [...simpleMetricAttributes.references, tagRefA],
      });
      // `tags` should not leak into the lens state
      const result = builder.fromAPIFormat(api);
      expect(JSON.stringify(result.state)).not.toContain('tags');
    });
  });

  describe('full round-trip', () => {
    it('preserves tag references through toAPIFormat → fromAPIFormat', () => {
      const original = {
        ...simpleMetricAttributes,
        references: [...simpleMetricAttributes.references, tagRefA, tagRefB],
      };

      const api = builder.toAPIFormat(original);
      const restored = builder.fromAPIFormat(api);

      const restoredTagIds = restored.references
        .filter((r) => r.type === 'tag')
        .map((r) => r.id)
        .sort();

      expect(restoredTagIds).toEqual([TAG_ID_A, TAG_ID_B].sort());
    });

    it('preserves non-tag references alongside tag references', () => {
      const original = {
        ...simpleMetricAttributes,
        references: [...simpleMetricAttributes.references, tagRefA],
      };

      const api = builder.toAPIFormat(original);
      const restored = builder.fromAPIFormat(api);

      // index-pattern references must also survive
      const indexPatternRefs = restored.references.filter((r) => r.type === 'index-pattern');
      expect(indexPatternRefs.length).toBeGreaterThan(0);
    });

    it('produces an empty tag list when no tags are present', () => {
      const api = builder.toAPIFormat(simpleMetricAttributes);
      const restored = builder.fromAPIFormat(api);
      const tagRefs = restored.references.filter((r) => r.type === 'tag');
      expect(tagRefs).toHaveLength(0);
    });
  });

  describe('ES|QL chart path', () => {
    it('includes tags in the ES|QL API output', () => {
      const attributes = {
        ...singleMetricESQLDatatableAttributes,
        references: [...(singleMetricESQLDatatableAttributes.references ?? []), tagRefA],
      };
      const api = builder.toAPIFormat(attributes);
      expect(api).toHaveProperty('tags', [TAG_ID_A]);
    });

    it('preserves panel filters alongside tags on ES|QL charts', () => {
      // filters should remain as a proper array, not spread as numeric keys
      const attributes = {
        ...singleMetricESQLDatatableAttributes,
        references: [...(singleMetricESQLDatatableAttributes.references ?? []), tagRefA],
        state: {
          ...singleMetricESQLDatatableAttributes.state,
          filters: [],
        },
      };
      const api = builder.toAPIFormat(attributes) as Record<string, unknown>;
      // filters must be an array property, not numeric-keyed entries
      if ('filters' in api) {
        expect(Array.isArray(api.filters)).toBe(true);
      }
      // tags must remain a plain string array
      expect(api.tags).toEqual([TAG_ID_A]);
    });
  });
});

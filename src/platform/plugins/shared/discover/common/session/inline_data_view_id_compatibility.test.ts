/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '@kbn/data-views-plugin/common';
import { generateInlineDataViewId } from './inline_data_view';
import { getInlineDataViewIdentity } from './inline_data_view_references';
import { createInlineDataViewIdCompatibility } from './inline_data_view_id_compatibility';

const inlineDataView: DataViewSpec = { title: 'logs-*', timeFieldName: '@timestamp' };
const otherDataView: DataViewSpec = { title: 'metrics-*' };
const inlineDataViewId = generateInlineDataViewId(inlineDataView);
const otherDataViewId = generateInlineDataViewId(otherDataView);
const identify = (index: DataViewSpec) => getInlineDataViewIdentity({ index });

describe('createInlineDataViewIdCompatibility', () => {
  describe('shared', () => {
    it('maps each previous ID that refers to a single spec', () => {
      const { shared } = createInlineDataViewIdCompatibility({
        views: [
          identify({ ...inlineDataView, id: 'first-id' }),
          identify({ ...inlineDataView, id: 'second-id' }),
          identify(inlineDataView),
          undefined,
        ],
      });

      expect(Object.fromEntries(shared)).toEqual({
        'first-id': inlineDataViewId,
        'second-id': inlineDataViewId,
      });
    });

    it('leaves out previous IDs that refer to different specs', () => {
      const { shared } = createInlineDataViewIdCompatibility({
        views: [
          identify({ ...inlineDataView, id: 'shared-id' }),
          identify({ ...otherDataView, id: 'shared-id' }),
        ],
      });

      expect(shared.size).toBe(0);
    });

    it('treats a derived ID used by another spec as ambiguous', () => {
      const { shared } = createInlineDataViewIdCompatibility({
        views: [
          identify({ ...inlineDataView, id: inlineDataViewId }),
          identify({ ...otherDataView, id: inlineDataViewId }),
        ],
      });

      expect(shared.has(inlineDataViewId)).toBe(false);
    });
  });

  describe('forView', () => {
    it('adds the own previous ID even when it is ambiguous elsewhere', () => {
      const identity = identify({ ...otherDataView, id: 'shared-id' });
      const { forView } = createInlineDataViewIdCompatibility({
        views: [identify({ ...inlineDataView, id: 'shared-id' }), identity],
      });

      expect(forView(identity).get('shared-id')).toBe(otherDataViewId);
    });

    it('returns the shared map when the view has no previous ID', () => {
      const { shared, forView } = createInlineDataViewIdCompatibility({
        views: [identify({ ...otherDataView, id: 'legacy-id' })],
      });

      expect(forView(identify(inlineDataView))).toBe(shared);
      expect(forView(undefined)).toBe(shared);
    });
  });

});

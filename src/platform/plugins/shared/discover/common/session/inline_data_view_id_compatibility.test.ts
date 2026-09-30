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
import {
  createInlineDataViewIdMap,
  withOwnInlineDataViewId,
} from './inline_data_view_id_compatibility';

const inlineDataView: DataViewSpec = { title: 'logs-*', timeFieldName: '@timestamp' };
const otherDataView: DataViewSpec = { title: 'metrics-*' };
const inlineDataViewId = generateInlineDataViewId(inlineDataView);
const otherDataViewId = generateInlineDataViewId(otherDataView);

describe('createInlineDataViewIdMap', () => {
  it('maps each previous ID that refers to a single spec', () => {
    const idMap = createInlineDataViewIdMap([
      getInlineDataViewIdentity({ index: { ...inlineDataView, id: 'first-id' } }),
      getInlineDataViewIdentity({ index: { ...inlineDataView, id: 'second-id' } }),
      getInlineDataViewIdentity({ index: inlineDataView }),
      undefined,
    ]);

    expect(Object.fromEntries(idMap)).toEqual({
      'first-id': inlineDataViewId,
      'second-id': inlineDataViewId,
    });
  });

  it('leaves out previous IDs that refer to different specs', () => {
    const idMap = createInlineDataViewIdMap([
      getInlineDataViewIdentity({ index: { ...inlineDataView, id: 'shared-id' } }),
      getInlineDataViewIdentity({ index: { ...otherDataView, id: 'shared-id' } }),
    ]);

    expect(idMap.size).toBe(0);
  });

  it('treats a derived ID used by another spec as ambiguous', () => {
    const idMap = createInlineDataViewIdMap([
      getInlineDataViewIdentity({ index: { ...inlineDataView, id: inlineDataViewId } }),
      getInlineDataViewIdentity({ index: { ...otherDataView, id: inlineDataViewId } }),
    ]);

    expect(idMap.has(inlineDataViewId)).toBe(false);
  });
});

describe('withOwnInlineDataViewId', () => {
  it('adds the own previous ID even when it is ambiguous elsewhere', () => {
    const identity = getInlineDataViewIdentity({ index: { ...otherDataView, id: 'shared-id' } });

    expect(withOwnInlineDataViewId(identity, new Map()).get('shared-id')).toBe(otherDataViewId);
  });

  it('returns the same map when the representation has no previous ID', () => {
    const idMap = new Map([['legacy-id', inlineDataViewId]]);
    const identity = getInlineDataViewIdentity({ index: inlineDataView });

    expect(withOwnInlineDataViewId(identity, idMap)).toBe(idMap);
  });
});

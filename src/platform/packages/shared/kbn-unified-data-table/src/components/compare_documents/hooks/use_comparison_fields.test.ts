/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import {
  MAX_COMPARISON_FIELDS,
  useComparisonFields,
  UseComparisonFieldsProps,
} from './use_comparison_fields';
import { buildDataViewMock, generateEsHits } from '@kbn/discover-utils/src/__mocks__';
import { dataViewWithTimefieldMock } from '../../../../__mocks__/data_view_with_timefield';
import { fieldList, FieldSpec } from '@kbn/data-views-plugin/common';
import { EsHitRecord } from '@kbn/discover-utils/types';

const matchValues = (hit: EsHitRecord) => {
  hit.fields!.bytes = [50];
  hit.fields!.extension = ['gif'];
  return hit;
};

const clearValues = (hit: EsHitRecord) => {
  hit.fields!.bytes = null;
  hit.fields!.extension = undefined;
  return hit;
};

const renderFields = ({
  props,
  transformHit = (hit) => hit,
}: {
  props?: Partial<Omit<UseComparisonFieldsProps, 'getDocById'>>;
  transformHit?: (hit: EsHitRecord) => EsHitRecord;
} = {}) => {
  const dataView = props?.dataView ?? dataViewWithTimefieldMock;
  const docs = generateEsHits(dataView, 5).map((hit) =>
    buildDataTableRecord(transformHit(hit), dataView)
  );
  const getDocById = (id: string) => docs.find((doc) => doc.raw._id === id);
  const {
    result: {
      current: { comparisonFields, totalFields },
    },
  } = renderHook(() =>
    useComparisonFields({
      dataView,
      selectedFieldNames: ['message', 'extension', 'bytes'],
      selectedDocIds: ['0', '1', '2'],
      showAllFields: true,
      showMatchingValues: true,
      getDocById,
      ...props,
    })
  );
  return { comparisonFields, totalFields };
};

describe('useComparisonFields', () => {
  it('should return all fields, with the time field first and other fields ordered alphabetically, if showAllFields is true', () => {
    const { comparisonFields, totalFields } = renderFields();
    expect(comparisonFields).toEqual([
      'timestamp',
      'bytes',
      'extension',
      'message',
      'scripted',
      '_index',
    ]);
    expect(totalFields).toBe(6);
  });

  it('should return only selectedFieldNames, preserving the selected order, if showAllFields is false', () => {
    const { comparisonFields, totalFields } = renderFields({ props: { showAllFields: false } });
    expect(comparisonFields).toEqual(['message', 'extension', 'bytes']);
    expect(totalFields).toBe(3);
  });

  it('should include fields with matching values if showMatchingValues is true', () => {
    const { comparisonFields, totalFields } = renderFields({ transformHit: matchValues });
    expect(comparisonFields).toEqual([
      'timestamp',
      'bytes',
      'extension',
      'message',
      'scripted',
      '_index',
    ]);
    expect(totalFields).toBe(6);
    const { comparisonFields: comparisonFields2, totalFields: totalFields2 } = renderFields({
      props: { showAllFields: false },
      transformHit: matchValues,
    });
    expect(comparisonFields2).toEqual(['message', 'extension', 'bytes']);
    expect(totalFields2).toBe(3);
  });

  it('should filter out fields with matching values if showMatchingValues is false', () => {
    const { comparisonFields, totalFields } = renderFields({
      props: { showMatchingValues: false },
      transformHit: matchValues,
    });
    expect(comparisonFields).toEqual(['timestamp', 'message', 'scripted']);
    expect(totalFields).toBe(3);
    const { comparisonFields: comparisonFields2, totalFields: totalFields2 } = renderFields({
      props: { showAllFields: false, showMatchingValues: false },
      transformHit: matchValues,
    });
    expect(comparisonFields2).toEqual(['message']);
    expect(totalFields2).toBe(1);
  });

  it('should filter out fields where all values are null/undefined if showAllFields is true', () => {
    const { comparisonFields, totalFields } = renderFields({ transformHit: clearValues });
    expect(comparisonFields).toEqual(['timestamp', 'message', 'scripted', '_index']);
    expect(totalFields).toBe(4);
  });

  it('should not filter out fields where all values are null/undefined if showAllFields is false', () => {
    const { comparisonFields, totalFields } = renderFields({
      props: { showAllFields: false },
      transformHit: clearValues,
    });
    expect(comparisonFields).toEqual(['message', 'extension', 'bytes']);
    expect(totalFields).toBe(3);
  });

  it(`should limit the number of comparison fields to ${MAX_COMPARISON_FIELDS}`, () => {
    const overflow = 10;
    const fields: FieldSpec[] = Array.from(
      { length: MAX_COMPARISON_FIELDS + overflow },
      (_, i) => ({
        name: `field${i}`,
        type: 'string',
        searchable: true,
        aggregatable: true,
      })
    );
    const dataView = buildDataViewMock({
      name: 'test',
      fields: fieldList(fields),
    });
    const { comparisonFields, totalFields } = renderFields({ props: { dataView } });
    expect(comparisonFields).toHaveLength(fields.length - overflow);
    expect(totalFields).toBe(fields.length);
  });
});

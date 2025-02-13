/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewField } from '@kbn/data-views-plugin/common';
import { buildDataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { getFieldCapabilities } from './get_field_capabilities';
import { DataView } from '@kbn/data-views-plugin/public';

const dataView = buildDataViewMock({
  name: 'test-index-view',
  fields: [
    {
      name: 'unknown_field',
      type: 'unknown',
    },
    {
      name: 'unknown_selected_field',
      type: 'unknown',
    },
    {
      name: 'bytes',
      type: 'number',
    },
    {
      name: 'runtime_field',
      type: 'unknown',
      runtimeField: {
        type: 'unknown',
        script: {
          source: "emit('hello world')",
        },
      },
    },
  ] as DataView['fields'],
});

describe('getFieldCapabilities', () => {
  it("should return true for canEdit if it's a known field type", () => {
    const field = dataView.getFieldByName('bytes') as DataViewField;
    const { canEdit } = getFieldCapabilities(dataView, field);
    expect(canEdit).toBe(true);
  });

  it("should return false for canEdit if it's an unknown field type", () => {
    const field = dataView.getFieldByName('unknown_field') as DataViewField;
    const { canEdit } = getFieldCapabilities(dataView, field);
    expect(canEdit).toBe(false);
  });

  it("should return false for canEdit if it's an unknown_selected field type", () => {
    const field = dataView.getFieldByName('unknown_selected_field') as DataViewField;
    const { canEdit } = getFieldCapabilities(dataView, field);
    expect(canEdit).toBe(false);
  });

  it("should return true for canEdit if it's a runtime field type", () => {
    const field = dataView.getFieldByName('runtime_field') as DataViewField;
    const { canEdit } = getFieldCapabilities(dataView, field);
    expect(canEdit).toBe(true);
  });

  it("should return true for canDelete if it's a runtime field type", () => {
    const field = dataView.getFieldByName('runtime_field') as DataViewField;
    const { canDelete } = getFieldCapabilities(dataView, field);
    expect(canDelete).toBe(true);
  });

  it("should return false for canDelete if it's not a runtime field type", () => {
    const field = dataView.getFieldByName('bytes') as DataViewField;
    const { canDelete } = getFieldCapabilities(dataView, field);
    expect(canDelete).toBe(false);
  });
});

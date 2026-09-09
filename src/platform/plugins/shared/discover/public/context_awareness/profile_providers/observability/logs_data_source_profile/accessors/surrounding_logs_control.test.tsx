/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import {
  buildDataViewMock,
  dataViewMock,
  dataViewMockWithTimeField,
} from '@kbn/discover-utils/src/__mocks__';
import { DataViewField } from '@kbn/data-views-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { RowControlRowProps } from '@kbn/discover-utils';
import { getInstanceFilter, createSurroundingLogsControl } from './surrounding_logs_control';
import type { ProfileProviderServices } from '../../../profile_provider_services';

const makeField = (name: string) =>
  new DataViewField({
    name,
    type: 'keyword',
    scripted: false,
    searchable: true,
    aggregatable: true,
  });

const dataViewWithEcsFields = buildDataViewMock({
  name: 'logs-data-view',
  timeFieldName: '@timestamp',
  fields: [
    makeField('kubernetes.pod.uid'),
    makeField('container.id'),
    makeField('service.node.name'),
    makeField('service.name'),
    makeField('host.name'),
  ] as unknown as DataView['fields'],
});

// ─── getInstanceFilter ────────────────────────────────────────────────────────

describe('getInstanceFilter', () => {
  it('returns a filter for the highest-priority identity field present in the record', () => {
    const record = buildDataTableRecord(
      {
        _id: 'doc-1',
        _index: 'logs-test',
        fields: {
          'kubernetes.pod.uid': ['pod-abc'],
          'service.name': ['my-service'],
        },
      },
      dataViewWithEcsFields
    );

    const filter = getInstanceFilter(record, dataViewWithEcsFields);

    expect(filter).toBeDefined();
    // The filter should target kubernetes.pod.uid — the highest-priority field
    expect(filter?.meta.key).toBe('kubernetes.pod.uid');
    expect(filter?.meta.params).toEqual({ query: 'pod-abc' });
  });

  it('falls back to the next available field when higher-priority fields are absent', () => {
    const record = buildDataTableRecord(
      {
        _id: 'doc-2',
        _index: 'logs-test',
        fields: { 'host.name': ['my-host'] },
      },
      dataViewWithEcsFields
    );

    const filter = getInstanceFilter(record, dataViewWithEcsFields);

    expect(filter).toBeDefined();
    expect(filter?.meta.key).toBe('host.name');
    expect(filter?.meta.params).toEqual({ query: 'my-host' });
  });

  it('uses only the first element when the field value is a multi-value array', () => {
    const record = buildDataTableRecord(
      {
        _id: 'doc-5',
        _index: 'logs-test',
        fields: { 'host.name': ['host-a', 'host-b'] },
      },
      dataViewWithEcsFields
    );

    const filter = getInstanceFilter(record, dataViewWithEcsFields);

    expect(filter?.meta.params).toEqual({ query: 'host-a' });
  });

  it('returns undefined when no identity fields are present in the record', () => {
    const record = buildDataTableRecord(
      { _id: 'doc-3', _index: 'logs-test', fields: {} },
      dataViewWithEcsFields
    );

    expect(getInstanceFilter(record, dataViewWithEcsFields)).toBeUndefined();
  });

  it('returns undefined when the field is not mapped in the data view', () => {
    // dataViewMock has no ECS identity fields
    const record = buildDataTableRecord(
      {
        _id: 'doc-4',
        _index: 'logs-test',
        fields: { 'kubernetes.pod.uid': ['pod-xyz'] },
      },
      dataViewMock
    );

    expect(getInstanceFilter(record, dataViewMock)).toBeUndefined();
  });
});

// ─── createSurroundingLogsControl ─────────────────────────────────────────────

describe('createSurroundingLogsControl', () => {
  const mockServices = {
    core: { overlays: { openFlyout: jest.fn() } },
  } as unknown as ProfileProviderServices;

  it('marks the control as available when the data view is time-based and the record has an _id', () => {
    const control = createSurroundingLogsControl(mockServices, dataViewMockWithTimeField);
    const record = buildDataTableRecord(
      { _id: 'doc-1', _index: 'logs-test', fields: {} },
      dataViewMockWithTimeField
    );

    expect(control.isAvailable?.({ record, rowIndex: 0 } as RowControlRowProps)).toBe(true);
  });

  it('marks the control as unavailable when the data view has no time field', () => {
    // dataViewMock has no timeFieldName, so isTimeBased() returns false
    const control = createSurroundingLogsControl(mockServices, dataViewMock);
    const record = buildDataTableRecord(
      { _id: 'doc-1', _index: 'logs-test', fields: {} },
      dataViewMock
    );

    expect(control.isAvailable?.({ record, rowIndex: 0 } as RowControlRowProps)).toBe(false);
  });

  it('marks the control as unavailable when the record has no _id', () => {
    const control = createSurroundingLogsControl(mockServices, dataViewMockWithTimeField);
    const record = buildDataTableRecord(
      { _id: 'doc-1', _index: 'logs-test', fields: {} },
      dataViewMockWithTimeField
    );
    // Simulate a record that arrived without an _id (e.g. from an ES|QL query)
    (record.raw as { _id?: string })._id = undefined;

    expect(control.isAvailable?.({ record, rowIndex: 0 } as RowControlRowProps)).toBe(false);
  });
});

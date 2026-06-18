/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { useEcsFieldNames } from './use_ecs_field_names';

const makeField = (name: string) => ({ name } as DataViewField);

const makeFieldsMetadata = (
  ecsFields: Record<string, { short?: string } | undefined>
): FieldsMetadataPublicStart =>
  ({
    getClient: jest.fn().mockResolvedValue({
      find: jest.fn().mockImplementation(({ fieldNames }: { fieldNames: string[] }) =>
        Promise.resolve({
          fields: Object.fromEntries(fieldNames.map((name) => [name, ecsFields[name]])),
        })
      ),
    }),
  } as unknown as FieldsMetadataPublicStart);

describe('useEcsFieldNames', () => {
  it('returns null when fieldsMetadata is not provided', () => {
    const { result } = renderHook(() => useEcsFieldNames([makeField('service.name')], undefined));
    expect(result.current).toBeNull();
  });

  it('returns null when fields array is empty', () => {
    const { result } = renderHook(() => useEcsFieldNames([], makeFieldsMetadata({})));
    expect(result.current).toBeNull();
  });

  it('resolves to a Set containing only fields with a short description', async () => {
    const fields = [makeField('service.name'), makeField('host.name'), makeField('labels.custom')];
    const fieldsMetadata = makeFieldsMetadata({
      'service.name': { short: 'Name of the service' },
      'host.name': { short: 'Name of the host' },
      'labels.custom': undefined,
    });

    const { result } = renderHook(() => useEcsFieldNames(fields, fieldsMetadata));

    expect(result.current).toBeNull();

    await waitFor(() => expect(result.current).not.toBeNull());

    expect(result.current).toEqual(new Set(['service.name', 'host.name']));
    expect(result.current?.has('labels.custom')).toBe(false);
  });

  it('resets to null and re-resolves when fields change', async () => {
    const fieldsMetadata = makeFieldsMetadata({
      'service.name': { short: 'Name of the service' },
      'host.name': { short: 'Name of the host' },
    });

    const { result, rerender } = renderHook(
      ({ fields }: { fields: DataViewField[] }) => useEcsFieldNames(fields, fieldsMetadata),
      { initialProps: { fields: [makeField('service.name')] } }
    );

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toEqual(new Set(['service.name']));

    rerender({ fields: [makeField('host.name')] });

    expect(result.current).toBeNull();

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toEqual(new Set(['host.name']));
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { useEcsFieldNames } from './use_ecs_field_names';

const SERVICE_NAME = 'service.name';
const HOST_NAME = 'host.name';
const LABELS_CUSTOM = 'labels.custom';

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
    const { result } = renderHook(() => useEcsFieldNames([SERVICE_NAME], undefined));
    expect(result.current).toBeNull();
  });

  it('returns null when fieldNames array is empty', () => {
    const { result } = renderHook(() => useEcsFieldNames([], makeFieldsMetadata({})));
    expect(result.current).toBeNull();
  });

  it('resolves to a Set containing only fields with a short description', async () => {
    const fieldNames = [SERVICE_NAME, HOST_NAME, LABELS_CUSTOM];
    const fieldsMetadata = makeFieldsMetadata({
      [SERVICE_NAME]: { short: 'Name of the service' },
      [HOST_NAME]: { short: 'Name of the host' },
      [LABELS_CUSTOM]: undefined,
    });

    const { result } = renderHook(() => useEcsFieldNames(fieldNames, fieldsMetadata));

    expect(result.current).toBeNull();

    await waitFor(() => expect(result.current).not.toBeNull());

    expect(result.current).toEqual(new Set([SERVICE_NAME, HOST_NAME]));
    expect(result.current?.has(LABELS_CUSTOM)).toBe(false);
  });

  it('resolves to an empty Set when getClient rejects', async () => {
    const fieldNames = [SERVICE_NAME];
    const fieldsMetadata = {
      getClient: jest.fn().mockRejectedValue(new Error('network error')),
    } as unknown as FieldsMetadataPublicStart;

    const { result } = renderHook(() => useEcsFieldNames(fieldNames, fieldsMetadata));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toEqual(new Set());
  });

  it('resolves to an empty Set when find rejects', async () => {
    const fieldNames = [SERVICE_NAME];
    const fieldsMetadata = {
      getClient: jest.fn().mockResolvedValue({
        find: jest.fn().mockRejectedValue(new Error('find error')),
      }),
    } as unknown as FieldsMetadataPublicStart;

    const { result } = renderHook(() => useEcsFieldNames(fieldNames, fieldsMetadata));

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current).toEqual(new Set());
  });

  it('resets to null and re-resolves when fieldNames change', async () => {
    const fieldsMetadata = makeFieldsMetadata({
      [SERVICE_NAME]: { short: 'Name of the service' },
      [HOST_NAME]: { short: 'Name of the host' },
    });

    const { result, rerender } = renderHook(
      ({ fieldNames }: { fieldNames: string[] }) => useEcsFieldNames(fieldNames, fieldsMetadata),
      { initialProps: { fieldNames: [SERVICE_NAME] } }
    );

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toEqual(new Set([SERVICE_NAME]));

    rerender({ fieldNames: [HOST_NAME] });

    expect(result.current).toBeNull();

    await waitFor(() => expect(result.current).not.toBeNull());
    expect(result.current).toEqual(new Set([HOST_NAME]));
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';

import * as kibanaServices from '../kibana_services';
import { ErrorEmbeddable, IEmbeddable } from '../lib';
import { useEmbeddablePanel } from './use_embeddable_panel';

describe('useEmbeddablePanel', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns the correct values when an unwrapped embeddable is provided', async () => {
    const embeddable: IEmbeddable = { id: 'supertest' } as unknown as IEmbeddable;

    const { result, waitForNextUpdate } = renderHook(() => useEmbeddablePanel({ embeddable }));

    await waitForNextUpdate();

    expect(result.current).toBeDefined();
    expect(result.current!.unwrappedEmbeddable).toEqual(embeddable);
    expect(result.current!.Panel).toBeDefined();
  });

  it('returns the correct values when embeddable is provided as an async function', async () => {
    const unwrappedEmbeddable: IEmbeddable = { id: 'supertest' } as unknown as IEmbeddable;
    const embeddable = jest
      .fn<Promise<IEmbeddable | ErrorEmbeddable>, []>()
      .mockResolvedValue(unwrappedEmbeddable);

    const { result, waitForNextUpdate } = renderHook(() => useEmbeddablePanel({ embeddable }));

    await waitForNextUpdate();

    expect(result.current).toBeDefined();
    expect(embeddable).toHaveBeenCalled();
    expect(result.current!.Panel).toBeDefined();
    expect(result.current!.unwrappedEmbeddable).toEqual(unwrappedEmbeddable);
  });

  it('calls untilPluginStartServicesReady', async () => {
    const embeddable: IEmbeddable = { id: 'supertest' } as unknown as IEmbeddable;
    const untilPluginStartServicesReadySpy = jest.spyOn(
      kibanaServices,
      'untilPluginStartServicesReady'
    );

    const { waitForNextUpdate } = renderHook(() => useEmbeddablePanel({ embeddable }));
    await waitForNextUpdate();

    expect(untilPluginStartServicesReadySpy).toHaveBeenCalled();
  });
});

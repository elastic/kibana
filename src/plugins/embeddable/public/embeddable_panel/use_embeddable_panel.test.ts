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

jest.mock('../kibana_services');

describe('useEmbeddablePanel', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('returns the correct values when embeddable is provided', async () => {
    const embeddable: IEmbeddable = { id: 'supertest' } as unknown as IEmbeddable;

    const { result, waitForNextUpdate } = renderHook(() => useEmbeddablePanel({ embeddable }));

    await waitForNextUpdate();

    expect(result.current).toBeDefined();
    expect(result.current!.unwrappedEmbeddable).toEqual(embeddable);
    expect(result.current!.Panel).toBeDefined();
  });

  it('returns the correct values when getEmbeddable is provided', async () => {
    const embeddable: IEmbeddable = { id: 'supertest' } as unknown as IEmbeddable;
    const getEmbeddable = jest
      .fn<Promise<IEmbeddable | ErrorEmbeddable>, []>()
      .mockResolvedValue(embeddable); // Replace with your desired resolved embeddable

    const { result, waitForNextUpdate } = renderHook(() => useEmbeddablePanel({ getEmbeddable }));

    await waitForNextUpdate();

    expect(result.current).toBeDefined();
    expect(getEmbeddable).toHaveBeenCalled();
    expect(result.current!.Panel).toBeDefined();
    expect(result.current!.unwrappedEmbeddable).toEqual(embeddable);
  });

  it('throws an error when neither embeddable nor getEmbeddable is provided', async () => {
    expect(() => {
      useEmbeddablePanel({});
    }).toThrow(
      Error('useEmbeddable must be run with either an embeddable or a getEmbeddable function')
    );
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

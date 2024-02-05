/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { render, waitFor } from '@testing-library/react';
import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { renderHook } from '@testing-library/react-hooks';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { useReactEmbeddableApiHandle, ReactEmbeddableParentContext } from './react_embeddable_api';
import { DefaultEmbeddableApi } from './types';

describe('react embeddable api', () => {
  const defaultApi = {
    unsavedChanges: new BehaviorSubject<object | undefined>(undefined),
    resetUnsavedChanges: jest.fn(),
    serializeState: jest.fn().mockReturnValue({ bork: 'borkbork' }),
  };

  const parentApi = getMockPresentationContainer();

  const TestComponent = React.forwardRef<DefaultEmbeddableApi>((_, ref) => {
    useReactEmbeddableApiHandle(defaultApi, ref, '123');
    return <div />;
  });

  it('returns the given API', () => {
    const { result } = renderHook(() =>
      useReactEmbeddableApiHandle<DefaultEmbeddableApi & { bork: () => 'bork' }>(
        {
          ...defaultApi,
          bork: jest.fn().mockReturnValue('bork'),
        },
        {} as any,
        'superBork'
      )
    );

    expect(result.current.bork()).toEqual('bork');
    expect(result.current.serializeState()).toEqual({ bork: 'borkbork' });
  });

  it('publishes the API into the provided ref', async () => {
    const ref = React.createRef<DefaultEmbeddableApi>();
    renderHook(() => useReactEmbeddableApiHandle(defaultApi, ref, '123'));
    await waitFor(() => expect(ref.current).toBeDefined());
    expect(ref.current?.serializeState);
    expect(ref.current?.serializeState()).toEqual({ bork: 'borkbork' });
  });

  it('publishes the API into an imperative handle', async () => {
    const ref = React.createRef<DefaultEmbeddableApi>();
    render(<TestComponent ref={ref} />);
    await waitFor(() => expect(ref.current).toBeDefined());
    expect(ref.current?.serializeState);
    expect(ref.current?.serializeState()).toEqual({ bork: 'borkbork' });
  });

  it('returns an API with a parent when rendered inside a parent context', async () => {
    const ref = React.createRef<DefaultEmbeddableApi>();
    render(
      <ReactEmbeddableParentContext.Provider value={{ parentApi }}>
        <TestComponent ref={ref} />
      </ReactEmbeddableParentContext.Provider>
    );
    await waitFor(() => expect(ref.current).toBeDefined());
    expect(ref.current?.serializeState);
    expect(ref.current?.serializeState()).toEqual({ bork: 'borkbork' });

    expect(ref.current?.parentApi?.getLastSavedStateForChild).toBeDefined();
    expect(ref.current?.parentApi?.registerPanelApi).toBeDefined();
  });

  it('calls registerPanelApi on its parent', async () => {
    const ref = React.createRef<DefaultEmbeddableApi>();
    render(
      <ReactEmbeddableParentContext.Provider value={{ parentApi }}>
        <TestComponent ref={ref} />
      </ReactEmbeddableParentContext.Provider>
    );
    expect(parentApi?.registerPanelApi).toHaveBeenCalledWith('123', expect.any(Object));
  });
});

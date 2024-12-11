/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { getDiscoverStateMock } from '../__mocks__/discover_state.mock';
import {
  DiscoverCustomizationProvider,
  useDiscoverCustomization,
  useDiscoverCustomization$,
  useDiscoverCustomizationService,
} from './customization_provider';
import {
  createCustomizationService,
  DiscoverCustomization,
  DiscoverCustomizationId,
  DiscoverCustomizationService,
} from './customization_service';

describe('useDiscoverCustomizationService', () => {
  it('should provide customization service', async () => {
    let resolveCallback = (_: () => void) => {};
    const promise = new Promise<() => void>((resolve) => {
      resolveCallback = resolve;
    });
    let service: DiscoverCustomizationService | undefined;
    const callback = jest.fn(({ customizations }) => {
      service = customizations;
      return promise;
    });
    const wrapper = renderHook(() =>
      useDiscoverCustomizationService({
        stateContainer: getDiscoverStateMock({ isTimeBased: true }),
        customizationCallbacks: [callback],
      })
    );
    expect(wrapper.result.current.isInitialized).toBe(false);
    expect(wrapper.result.current.customizationService).toBeUndefined();
    expect(callback).toHaveBeenCalledTimes(1);
    const cleanup = jest.fn();
    await act(async () => {
      resolveCallback(cleanup);
      await promise;
    });
    expect(wrapper.result.current.isInitialized).toBe(true);
    expect(wrapper.result.current.customizationService).toBeDefined();
    expect(wrapper.result.current.customizationService).toBe(service);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();
    wrapper.unmount();
    await act(async () => {
      await promise;
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe('useDiscoverCustomization', () => {
  it('should provide customization', () => {
    const customization: DiscoverCustomization = { id: 'top_nav' };
    const wrapper = renderHook(() => useDiscoverCustomization('top_nav'), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => {
        const service = createCustomizationService();
        service.set(customization);
        return (
          <DiscoverCustomizationProvider value={service}>{children}</DiscoverCustomizationProvider>
        );
      },
    });
    expect(wrapper.result.current).toBe(customization);
  });

  it('should allow changing the customization', () => {
    const customization: DiscoverCustomization = { id: 'top_nav' };
    const service = createCustomizationService();
    const wrapper = renderHook(({ id }) => useDiscoverCustomization(id), {
      initialProps: { id: customization.id } as React.PropsWithChildren<{
        id: DiscoverCustomizationId;
      }>,
      wrapper: ({ children }) => {
        service.set(customization);
        return (
          <DiscoverCustomizationProvider value={service}>{children}</DiscoverCustomizationProvider>
        );
      },
    });
    expect(wrapper.result.current).toBe(customization);
    const newCustomization: DiscoverCustomization = { id: 'search_bar' };
    service.set(newCustomization);
    wrapper.rerender({ id: 'search_bar' });
    expect(wrapper.result.current).toBe(newCustomization);
  });

  it('should provide undefined if customization is not found', () => {
    const wrapper = renderHook(() => useDiscoverCustomization('top_nav'), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => {
        const service = createCustomizationService();
        return (
          <DiscoverCustomizationProvider value={service}>{children}</DiscoverCustomizationProvider>
        );
      },
    });
    expect(wrapper.result.current).toBeUndefined();
  });
});

describe('useDiscoverCustomization$', () => {
  it('should provide customization$', () => {
    const customization: DiscoverCustomization = { id: 'top_nav' };
    const wrapper = renderHook(() => useDiscoverCustomization$('top_nav'), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => {
        const service = createCustomizationService();
        service.set(customization);
        return (
          <DiscoverCustomizationProvider value={service}>{children}</DiscoverCustomizationProvider>
        );
      },
    });
    let result: DiscoverCustomization | undefined;
    wrapper.result.current.subscribe((current) => {
      result = current;
    });
    expect(result).toBe(customization);
  });

  it('should allow changing the customization', () => {
    const customization: DiscoverCustomization = { id: 'top_nav' };
    const service = createCustomizationService();
    const wrapper = renderHook(({ id }) => useDiscoverCustomization$(id), {
      initialProps: { id: customization.id } as React.PropsWithChildren<{
        id: DiscoverCustomizationId;
      }>,
      wrapper: ({ children }) => {
        service.set(customization);
        return (
          <DiscoverCustomizationProvider value={service}>{children}</DiscoverCustomizationProvider>
        );
      },
    });
    let result: DiscoverCustomization | undefined;
    wrapper.result.current.subscribe((current) => {
      result = current;
    });
    expect(result).toBe(customization);
    const newCustomization: DiscoverCustomization = { id: 'search_bar' };
    service.set(newCustomization);
    wrapper.rerender({ id: 'search_bar' });
    wrapper.result.current.subscribe((current) => {
      result = current;
    });
    expect(result).toBe(newCustomization);
  });

  it('should provide undefined if customization is not found', () => {
    const wrapper = renderHook(() => useDiscoverCustomization$('top_nav'), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => {
        const service = createCustomizationService();
        return (
          <DiscoverCustomizationProvider value={service}>{children}</DiscoverCustomizationProvider>
        );
      },
    });
    let result: DiscoverCustomization | undefined;
    wrapper.result.current.subscribe((current) => {
      result = current;
    });
    expect(result).toBeUndefined();
  });
});

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
  type ConnectedCustomizationService,
  getConnectedCustomizationService,
  useDiscoverCustomization,
  useDiscoverCustomization$,
} from './customization_provider';
import type { DiscoverCustomization, DiscoverCustomizationId } from './customization_service';
import { createCustomizationService } from './customization_service';
import type { CustomizationCallback } from './types';
import { DiscoverTestProvider } from '../__mocks__/test_provider';
import { createDiscoverServicesMock } from '../__mocks__/services';

describe('getConnectedCustomizationService', () => {
  it('should provide customization service', async () => {
    let resolveCallback = (_: () => void) => {};
    const promise = new Promise<() => void>((resolve) => {
      resolveCallback = resolve;
    });
    const callback = jest.fn(({}) => {
      return promise;
    });
    const customizationCallbacks: CustomizationCallback[] = [callback];
    const stateContainer = getDiscoverStateMock({ isTimeBased: true });
    const servicePromise = getConnectedCustomizationService({
      stateContainer,
      customizationCallbacks,
      services: createDiscoverServicesMock(),
    });
    let service: ConnectedCustomizationService | undefined;
    expect(callback).toHaveBeenCalledTimes(1);
    const cleanup = jest.fn();
    await act(async () => {
      resolveCallback(cleanup);
      await promise;
      service = await servicePromise;
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();
    await service?.cleanup();
    await act(async () => {
      await promise;
    });
    expect(callback).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});

describe('useDiscoverCustomization', () => {
  it('should provide customization', () => {
    const customization: DiscoverCustomization = { id: 'search_bar' };
    const service = createCustomizationService();
    service.set(customization);
    const wrapper = renderHook(() => useDiscoverCustomization('search_bar'), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => {
        return (
          <DiscoverTestProvider customizationService={service}>{children}</DiscoverTestProvider>
        );
      },
    });
    expect(wrapper.result.current).toBe(customization);
  });

  it('should allow changing the customization', () => {
    const customization: DiscoverCustomization = { id: 'search_bar' };
    const service = createCustomizationService();
    service.set(customization);
    const wrapper = renderHook(({ id }) => useDiscoverCustomization(id), {
      initialProps: { id: customization.id } as React.PropsWithChildren<{
        id: DiscoverCustomizationId;
      }>,
      wrapper: ({ children }) => {
        return (
          <DiscoverTestProvider customizationService={service}>{children}</DiscoverTestProvider>
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
    const service = createCustomizationService();
    const wrapper = renderHook(() => useDiscoverCustomization('search_bar'), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => {
        return (
          <DiscoverTestProvider customizationService={service}>{children}</DiscoverTestProvider>
        );
      },
    });
    expect(wrapper.result.current).toBeUndefined();
  });
});

describe('useDiscoverCustomization$', () => {
  it('should provide customization$', () => {
    const customization: DiscoverCustomization = { id: 'search_bar' };
    const service = createCustomizationService();
    service.set(customization);
    const wrapper = renderHook(() => useDiscoverCustomization$('search_bar'), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => {
        return (
          <DiscoverTestProvider customizationService={service}>{children}</DiscoverTestProvider>
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
    const customization: DiscoverCustomization = { id: 'search_bar' };
    const service = createCustomizationService();
    service.set(customization);
    const wrapper = renderHook(({ id }) => useDiscoverCustomization$(id), {
      initialProps: { id: customization.id } as React.PropsWithChildren<{
        id: DiscoverCustomizationId;
      }>,
      wrapper: ({ children }) => {
        return (
          <DiscoverTestProvider customizationService={service}>{children}</DiscoverTestProvider>
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
    const service = createCustomizationService();
    const wrapper = renderHook(() => useDiscoverCustomization$('search_bar'), {
      wrapper: ({ children }: React.PropsWithChildren<{}>) => {
        return (
          <DiscoverTestProvider customizationService={service}>{children}</DiscoverTestProvider>
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import type { ProjectRouting } from '@kbn/es-query';
import { useProjectRouting } from './use_project_routing';
import type { VisualizeServices } from '../../types';
import { createVisualizeServicesMock } from '../mocks';
import type { CPSPluginStart } from '@kbn/cps/public';

describe('useProjectRouting', () => {
  let mockServices: jest.Mocked<VisualizeServices>;
  let mockProjectRouting$: BehaviorSubject<ProjectRouting | undefined>;

  beforeEach(() => {
    mockServices = createVisualizeServicesMock();
    mockProjectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(undefined);
  });

  afterEach(() => {
    mockProjectRouting$.complete();
  });

  it('should return undefined when CPS is not available', () => {
    mockServices.cps = undefined;
    const { result } = renderHook(() => useProjectRouting(mockServices));
    expect(result.current).toBeUndefined();
  });

  it('should return undefined when cpsManager is not available', () => {
    mockServices.cps = {} as unknown as CPSPluginStart;

    const { result } = renderHook(() => useProjectRouting(mockServices));

    expect(result.current).toBeUndefined();
  });

  it('should create manager with correct methods when enabled', () => {
    const mockProjectRouting: ProjectRouting = `alias:_*`;
    mockServices.cps = {
      cpsManager: {
        getProjectPickerAccess: jest.fn(() => 'enabled'),
        getProjectRouting: jest.fn(() => mockProjectRouting),
        getProjectRouting$: jest.fn(() => mockProjectRouting$),
      },
    } as unknown as CPSPluginStart;

    const { result } = renderHook(() => useProjectRouting(mockServices));

    expect(result.current).toBeDefined();
    expect(result.current?.getProjectRouting).toBeDefined();
    expect(result.current?.getProjectRouting$).toBeDefined();
    expect(typeof result.current?.getProjectRouting).toBe('function');
    expect(typeof result.current?.getProjectRouting$).toBe('function');
  });

  it('should return current project routing', () => {
    const mockProjectRouting: ProjectRouting = `_alias:_origin`;
    mockProjectRouting$.next(mockProjectRouting);

    mockServices.cps = {
      cpsManager: {
        getProjectPickerAccess: jest.fn(() => 'enabled'),
        getProjectRouting: jest.fn(() => mockProjectRouting),
        getProjectRouting$: jest.fn(() => mockProjectRouting$),
      },
    } as unknown as CPSPluginStart;

    const { result } = renderHook(() => useProjectRouting(mockServices));

    expect(result.current?.getProjectRouting()).toEqual(mockProjectRouting);
  });

  it('should return observable from getProjectRouting$', () => {
    const mockProjectRouting: ProjectRouting = `_alias:_origin`;
    mockServices.cps = {
      cpsManager: {
        getProjectPickerAccess: jest.fn(() => 'enabled'),
        getProjectRouting: jest.fn(() => mockProjectRouting),
        getProjectRouting$: jest.fn(() => mockProjectRouting$),
      },
    } as unknown as CPSPluginStart;

    const { result } = renderHook(() => useProjectRouting(mockServices));

    const observable = result.current?.getProjectRouting$();
    expect(observable).toBeDefined();

    let receivedValue: ProjectRouting | undefined;
    const subscription = observable?.subscribe((value) => {
      receivedValue = value;
    });

    expect(receivedValue).toBeUndefined();

    mockProjectRouting$.next(mockProjectRouting);
    expect(receivedValue).toEqual(mockProjectRouting);

    subscription?.unsubscribe();
  });

  it('should sync projectRouting$ with CPS manager changes', () => {
    const mockProjectRouting: ProjectRouting = `alias:_*`;
    const mockProjectRouting2: ProjectRouting = `_alias:_origin`;

    // Initialize the BehaviorSubject with the initial value
    mockProjectRouting$.next(mockProjectRouting);

    mockServices.cps = {
      cpsManager: {
        getProjectPickerAccess: jest.fn(() => 'enabled'),
        getProjectRouting: jest.fn(() => mockProjectRouting),
        getProjectRouting$: jest.fn(() => mockProjectRouting$),
      },
    } as unknown as CPSPluginStart;

    const { result } = renderHook(() => useProjectRouting(mockServices));

    let receivedValue: ProjectRouting | undefined;
    const subscription = result.current?.getProjectRouting$().subscribe((value) => {
      receivedValue = value;
    });

    // Initial value from cpsManager.getProjectRouting()
    expect(receivedValue).toEqual(mockProjectRouting);

    // Simulate CPS manager emitting new project routing
    mockProjectRouting$.next(mockProjectRouting2);

    expect(receivedValue).toEqual(mockProjectRouting2);
    expect(result.current?.getProjectRouting()).toEqual(mockProjectRouting2);

    subscription?.unsubscribe();
  });

  it('should cleanup subscriptions on unmount', () => {
    const unsubscribeMock = jest.fn();
    mockProjectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(undefined);
    const originalSubscribe = mockProjectRouting$.subscribe.bind(mockProjectRouting$);

    // Spy on subscribe to track unsubscribe calls
    mockProjectRouting$.subscribe = jest.fn((...args: any[]) => {
      const subscription = originalSubscribe(...args);
      const originalUnsubscribe = subscription.unsubscribe.bind(subscription);
      subscription.unsubscribe = jest.fn(() => {
        unsubscribeMock();
        originalUnsubscribe();
      });
      return subscription;
    });

    mockServices.cps = {
      cpsManager: {
        getProjectPickerAccess: jest.fn(() => 'enabled'),
        getProjectRouting: jest.fn(() => undefined),
        getProjectRouting$: jest.fn(() => mockProjectRouting$),
      },
    } as any;

    const { unmount } = renderHook(() => useProjectRouting(mockServices));

    expect(unsubscribeMock).not.toHaveBeenCalled();

    unmount();

    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('should not duplicate values in observable when CPS emits same value', () => {
    const mockProjectRouting: ProjectRouting = `alias:_*`;

    // Initialize the BehaviorSubject with the initial value
    mockProjectRouting$.next(mockProjectRouting);

    mockServices.cps = {
      cpsManager: {
        getProjectPickerAccess: jest.fn(() => 'enabled'),
        getProjectRouting: jest.fn(() => mockProjectRouting),
        getProjectRouting$: jest.fn(() => mockProjectRouting$),
      },
    } as unknown as CPSPluginStart;

    const { result } = renderHook(() => useProjectRouting(mockServices));

    const receivedValues: (ProjectRouting | undefined)[] = [];
    const subscription = result.current?.getProjectRouting$().subscribe((value) => {
      receivedValues.push(value);
    });

    // Initial value
    expect(receivedValues).toHaveLength(1);
    expect(receivedValues[0]).toEqual(mockProjectRouting);

    // Emit the same value
    mockProjectRouting$.next(mockProjectRouting);

    // Should not emit duplicate
    expect(receivedValues).toHaveLength(1);

    // Emit a different value
    const mockProjectRouting2: ProjectRouting = `_alias:_origin`;
    mockProjectRouting$.next(mockProjectRouting2);

    // Should emit the new value
    expect(receivedValues).toHaveLength(2);
    expect(receivedValues[1]).toEqual(mockProjectRouting2);

    subscription?.unsubscribe();
  });
});

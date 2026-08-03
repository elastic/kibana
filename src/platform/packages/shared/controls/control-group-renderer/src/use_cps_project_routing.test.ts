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

import type { CPSPluginStart } from '@kbn/cps/public';
import type { ProjectRouting } from '@kbn/es-query';

import { useCpsProjectRoutingApi } from './use_cps_project_routing';

const mockServices: { services: { cps?: CPSPluginStart } } = { services: {} };

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(() => mockServices),
}));

describe('useCpsProjectRoutingApi', () => {
  let cpsProjectRouting$: BehaviorSubject<ProjectRouting | undefined>;

  beforeEach(() => {
    cpsProjectRouting$ = new BehaviorSubject<ProjectRouting | undefined>(undefined);
    mockServices.services = {};
  });

  afterEach(() => {
    cpsProjectRouting$.complete();
  });

  const enableCps = (initialRouting: ProjectRouting | undefined) => {
    cpsProjectRouting$.next(initialRouting);
    mockServices.services.cps = {
      cpsManager: {
        getProjectRouting: jest.fn(() => cpsProjectRouting$.getValue()),
        getProjectRouting$: jest.fn(() => cpsProjectRouting$),
      },
    } as unknown as CPSPluginStart;
  };

  it('returns undefined when CPS is unavailable', () => {
    const { result } = renderHook(() => useCpsProjectRoutingApi());
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when cpsManager is unavailable', () => {
    mockServices.services.cps = {} as CPSPluginStart;
    const { result } = renderHook(() => useCpsProjectRoutingApi());
    expect(result.current).toBeUndefined();
  });

  it('seeds projectRouting$ with the current CPS routing', () => {
    enableCps('_alias:_origin');
    const { result } = renderHook(() => useCpsProjectRoutingApi());
    expect(result.current?.projectRouting$.getValue()).toBe('_alias:_origin');
  });

  it('syncs projectRouting$ when the CPS picker changes', () => {
    enableCps(undefined);
    const { result } = renderHook(() => useCpsProjectRoutingApi());
    expect(result.current?.projectRouting$.getValue()).toBeUndefined();

    cpsProjectRouting$.next('_alias:*');
    expect(result.current?.projectRouting$.getValue()).toBe('_alias:*');
  });

  it('stops syncing after unmount', () => {
    enableCps('_alias:_origin');
    const { result, unmount } = renderHook(() => useCpsProjectRoutingApi());
    const { projectRouting$ } = result.current!;

    unmount();

    cpsProjectRouting$.next('_alias:*');
    expect(projectRouting$.getValue()).toBe('_alias:_origin');
  });
});

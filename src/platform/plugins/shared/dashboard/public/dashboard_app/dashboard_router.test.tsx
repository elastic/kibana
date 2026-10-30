/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import * as kibanaUtils from '@kbn/kibana-utils-plugin/public';

import { mountApp } from './dashboard_router';
import type { DashboardMountContextProps } from './types';
import { DashboardListingPage } from './listing_page/dashboard_listing_page';
import { embeddableService } from '../services/kibana_services';

jest.mock('./listing_page/dashboard_listing_page', () => ({
  DashboardListingPage: jest.fn(() => null),
}));
jest.mock('./dashboard_app', () => ({ DashboardApp: () => null }));

const mockListingPage = DashboardListingPage as unknown as jest.Mock;

const getRenderedStorages = (): IKbnUrlStateStorage[] =>
  mockListingPage.mock.calls.map(([props]) => props.kbnUrlStateStorage);

describe('dashboard router', () => {
  let element: HTMLElement;
  let createStorageSpy: jest.SpyInstance;

  const mount = () =>
    mountApp({
      coreStart: coreMock.createStart(),
      element,
      appUnMounted: jest.fn(),
      mountContext: {
        scopedHistory: () => ({ listen: jest.fn(() => jest.fn()) }),
      } as unknown as DashboardMountContextProps,
    });

  beforeEach(() => {
    window.location.hash = '#/list';
    element = document.createElement('div');
    document.body.appendChild(element);
    mockListingPage.mockClear();
    performance.clearMarks = jest.fn();
    createStorageSpy = jest.spyOn(kibanaUtils, 'createKbnUrlStateStorage');
    jest
      .spyOn(embeddableService, 'getStateTransfer')
      .mockReturnValue({ getIncomingEmbeddablePackage: jest.fn() } as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    element.remove();
  });

  it('keeps the same url state storage when the listing route re-renders', async () => {
    const unmount = await mount();

    await act(async () => {
      window.location.hash = '#/list?filter=a';
    });
    await act(async () => {
      window.location.hash = '#/list?filter=ab';
    });

    const storages = getRenderedStorages();
    expect(storages.length).toBeGreaterThan(1);
    expect(new Set(storages).size).toBe(1);
    expect(createStorageSpy).toHaveBeenCalledTimes(1);

    unmount();
  });

  it('creates a new url state storage for each app mount', async () => {
    const unmountFirst = await mount();
    const [firstStorage] = getRenderedStorages();
    unmountFirst();

    mockListingPage.mockClear();
    const unmountSecond = await mount();
    const [secondStorage] = getRenderedStorages();
    unmountSecond();

    expect(secondStorage).not.toBe(firstStorage);
    expect(createStorageSpy).toHaveBeenCalledTimes(2);
  });
});

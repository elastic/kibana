/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { mockDeprecationsFactory } from './mocks';

export const mockedDeprecationFactoryInstance = mockDeprecationsFactory.create();
export const DeprecationsFactoryMock = vi
  .fn()
  .mockImplementation(() => mockedDeprecationFactoryInstance);

export const registerConfigDeprecationsInfoMock = vi.fn();
export const registerApiDeprecationsInfoMock = vi.fn();

export const loggingMock = {
  configure: vi.fn(),
};

vi.doMock('./deprecations', () => {
      const mocked = {
      registerConfigDeprecationsInfo: registerConfigDeprecationsInfoMock,
      registerApiDeprecationsInfo: registerApiDeprecationsInfoMock,
    };
      return { ...mocked, default: mocked };
    });

vi.doMock('./deprecations_factory', () => {
      const mocked = {
      DeprecationsFactory: DeprecationsFactoryMock,
    };
      return { ...mocked, default: mocked };
    });

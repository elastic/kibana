/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { RenderingService } from '@kbn/core-rendering-browser';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';

/**
 * This is declared internally to avoid a circular dependency issue
 */
export interface RenderingServiceInternal {
  start: (deps: unknown) => RenderingService;
  renderCore: (deps: unknown, targetDomElement: HTMLElement) => void;
}

const createMockInternal = () => {
  const mocked: jest.Mocked<RenderingServiceInternal> = {
    start: jest.fn().mockImplementation(createMock),
    renderCore: jest.fn(),
  };
  return mocked;
};

const createMock = () => {
  const mocked: jest.Mocked<RenderingService> = {
    addContext: jest.fn().mockImplementation((element) => (
      <I18nProvider>
        <EuiProvider>{element}</EuiProvider>
      </I18nProvider>
    )),
  };
  return mocked;
};

export const renderingServiceMock = {
  createInternal: createMockInternal,
  create: createMock,
};

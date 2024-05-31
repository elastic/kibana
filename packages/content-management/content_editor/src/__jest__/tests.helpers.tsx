/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import type { ComponentType } from 'react';

import { TagSelector, TagList } from '../mocks';
import { ContentEditorProvider } from '../services';
import type { Services } from '../services';

export const getMockServices = (overrides?: Partial<Services>) => {
  const services = {
    openFlyout: jest.fn(() => ({
      onClose: Promise.resolve(),
      close: () => Promise.resolve(),
    })),
    TagList,
    TagSelector,
    notifyError: () => undefined,
    ...overrides,
  };

  return services;
};

export function WithServices<P>(Comp: ComponentType<P>, overrides: Partial<Services> = {}) {
  return (props: P) => {
    const services = getMockServices(overrides);
    return (
      <ContentEditorProvider {...services}>
        {/* @ts-expect-error upgrade typescript v4.9.5*/}
        <Comp {...props} />
      </ContentEditorProvider>
    );
  };
}

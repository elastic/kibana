/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { coreMock } from '@kbn/core/public/mocks';
import type {
  KibanaReactContextValue,
  KibanaServices,
} from '@kbn/kibana-react-plugin/public/context';

/**
 * Creates a mock for the withKibana HOC that can be used in tests.
 * This utility allows for consistent mocking of the withKibana HOC across the codebase.
 *
 * @param mockKibanaContext - The mock Kibana context to be provided to the component
 * @param additionalProps - Additional props to be passed to the wrapped component
 * @returns A mock implementation of the withKibana HOC
 *
 * @example
 * ```typescript
 * // Correct usage pattern with Jest's hoisting behavior
 * jest.mock('@kbn/kibana-react-plugin/public', () => {
 *   // Import the function inside the factory to avoid hoisting issues
 *   const { createWithKibanaMock } = require('@kbn/test-jest-helpers');
 *
 *   // Define the mock context inside the factory
 *   const mockContext = {
 *     services: {
 *       someService: { method: jest.fn() },
 *     },
 *     notifications: {
 *       toasts: {
 *         show: jest.fn(),
 *         success: jest.fn(),
 *         warning: jest.fn(),
 *         danger: jest.fn(),
 *       },
 *     },
 *     overlays: {
 *       openFlyout: jest.fn(),
 *       openModal: jest.fn(),
 *     },
 *   };
 *
 *   return {
 *     withKibana: createWithKibanaMock(mockContext),
 *   };
 * });
 * ```
 *
 * @example
 * ```typescript
 * // With additional props
 * jest.mock('@kbn/kibana-react-plugin/public', () => {
 *   const { createWithKibanaMock } = require('@kbn/test-jest-helpers');
 *
 *   const mockContext = {
 *     services: {
 *       someService: { method: jest.fn() },
 *     },
 *     notifications: {
 *       toasts: {
 *         show: jest.fn(),
 *       },
 *     },
 *     overlays: {
 *       openFlyout: jest.fn(),
 *       openModal: jest.fn(),
 *     },
 *   };
 *
 *   const additionalProps = {
 *     annotationUpdatesService: { subscribe: jest.fn() },
 *   };
 *
 *   return {
 *     withKibana: createWithKibanaMock(mockContext, additionalProps),
 *   };
 * });
 * ```
 */
export function createWithKibanaMock<Services extends KibanaServices = KibanaServices, T = unknown>(
  mockKibanaContext: Partial<KibanaReactContextValue<Services>> = {},
  additionalProps: T = {} as T
): (Component: React.ComponentType<any>) => React.FC<any> {
  return (Component: React.ComponentType<any>) => {
    const EnhancedComponent: React.FC<any> = (props) => {
      return React.createElement(Component, {
        ...props,
        kibana: {
          ...coreMock.createStart(),
          ...mockKibanaContext,
        },
        ...additionalProps,
      });
    };

    return EnhancedComponent;
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { configureAxe } from 'jest-axe';
import { Result } from 'axe-core';
import { AXE_OPTIONS, AXE_CONFIG } from '@kbn/test';
import { ReactWrapper } from './testbed/types';

const axeRunner = configureAxe({ globalOptions: { ...AXE_CONFIG } });

/**
 * Function to test if a component doesn't have a11y violations from axe automated testing
 * @param component
 */
export const expectToBeAccessible = async (component: ReactWrapper): Promise<void> => {
  const violations = await getA11yViolations(component);
  expect(violations).toHaveLength(0);
};

/**
 * Returns a11y violations as found by axe testing
 * @param component
 */
export const getA11yViolations = async (component: ReactWrapper): Promise<Result[]> => {
  const axeResults = await axeRunner(component.html(), {
    ...AXE_OPTIONS,
    resultTypes: ['violations'],
  });
  return axeResults.violations;
};

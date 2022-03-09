/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { configureAxe } from 'jest-axe';
import { AXE_OPTIONS, AXE_CONFIG } from '@kbn/test';
import { ReactWrapper } from './testbed/types';

const axeRunner = configureAxe({ globalOptions: { ...AXE_CONFIG } });

/**
 * Function to test if a component doesn't have a11y violations from axe automated testing
 * @param component
 */
export const expectToBeAccessible = async (component: ReactWrapper): Promise<void> => {
  const axeResults = await axeRunner(component.html(), {
    ...AXE_OPTIONS,
    resultTypes: ['violations'],
  });
  expect(axeResults.violations).toHaveLength(0);
};

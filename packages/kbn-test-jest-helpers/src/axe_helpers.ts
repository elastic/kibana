/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line import/no-extraneous-dependencies
import { axe } from 'jest-axe';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ImpactValue, Result } from 'axe-core';
import { ReactWrapper } from './testbed/types';

/**
 * Function to get an array of a11y violations from axe automated testing
 * @param component
 * @param impactLevel One of 'minor', 'moderate', 'serious', 'critical'. Default is 'critical'.
 */
export const getA11yViolations = async (
  component: ReactWrapper,
  impactLevel?: ImpactValue
): Promise<Result[]> => {
  impactLevel = impactLevel ?? 'critical';
  const axeResults = await axe(component.html(), { resultTypes: ['violations'] });
  return axeResults.violations.filter((violation) => violation.impact === impactLevel);
};

/**
 * Function to test if a component doesn't have a11y violations from axe automated testing
 * @param component
 * @param impactLevel One of 'minor', 'moderate', 'serious', 'critical'. Default is 'critical'.
 */
export const expectToBeAccessible = async (
  component: ReactWrapper,
  impactLevel?: ImpactValue
): Promise<void> => {
  const violations = await getA11yViolations(component, impactLevel);
  expect(violations).toHaveLength(0);
};

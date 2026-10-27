/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { computeTestID } from '@kbn/scout-reporting';

import type { TestFailure } from './get_failures';
import { getLocationFromClassname } from './get_failures';
import type { ScoutTestFailureExtended } from './get_scout_failures';

const SOURCE_FILE = /\.[cm]?[jt]sx?$/;

export const isScoutFailure = (failure: TestFailure): failure is ScoutTestFailureExtended =>
  'id' in failure && 'target' in failure && 'location' in failure;

/** The repository-relative test file of a failure, when its report recorded one. */
export const getTestFilePath = (
  failure: TestFailure | ScoutTestFailureExtended
): string | undefined => {
  // jest classnames only name the directory, the file is in the suite name the reporter kept as location
  const location =
    isScoutFailure(failure) || failure.testType === 'jest'
      ? failure.location
      : getLocationFromClassname(failure.classname);
  return location && SOURCE_FILE.test(location) ? location : undefined;
};

/**
 * The id the Scout reporters give a test. Scout failures carry it; FTR and Jest failures get the
 * id their Scout reporter computes from the file and the full title, which is the JUnit name.
 */
export const getScoutTestId = (
  failure: TestFailure | ScoutTestFailureExtended
): string | undefined => {
  if (isScoutFailure(failure)) {
    return failure.id;
  }
  if (failure.testType !== 'ftr' && failure.testType !== 'jest') {
    return undefined;
  }
  const filePath = getTestFilePath(failure);
  return filePath && failure.name ? computeTestID(filePath, failure.name) : undefined;
};

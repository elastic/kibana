/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { addAdditionalArgs } from '.';
import { AdditionalArgs } from '../../types';

const buildMaxFormula = (selector: string, additionalArgs: AdditionalArgs) => {
  return `max(${selector}${addAdditionalArgs(additionalArgs)})`;
};

const buildСounterRateFormula = (aggFormula: string, selector: string) => {
  return `${aggFormula}(${selector})`;
};

export const buildCounterRateFormula = (
  aggFormula: string,
  fieldName: string,
  additionalArgs: AdditionalArgs
) => {
  const maxFormula = buildMaxFormula(fieldName, additionalArgs);

  const counterRateFormula = buildСounterRateFormula(aggFormula, maxFormula);
  return counterRateFormula;
};

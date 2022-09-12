/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { addAdditionalArgs } from '.';
import { AdditionalFormulaArgs } from '../../types';

const buildMaxFormula = (selector: string, additionalArgs: AdditionalFormulaArgs) => {
  return `max(${selector}${addAdditionalArgs(additionalArgs)})`;
};

const buildСounterRateFormula = (aggFormula: string, selector: string) => {
  return `${aggFormula}(${selector})`;
};

export const buildCounterRateFormula = (
  aggFormula: string,
  fieldName: string,
  additionalArgs: AdditionalFormulaArgs
) => {
  const maxFormula = buildMaxFormula(fieldName, additionalArgs);

  const counterRateFormula = buildСounterRateFormula(aggFormula, maxFormula);
  return counterRateFormula;
};

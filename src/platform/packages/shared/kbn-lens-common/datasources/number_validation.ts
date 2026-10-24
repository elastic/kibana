/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const areDecimalsValid = (inputValue: string | number, digits: number): boolean => {
  const [, decimals = ''] = `${inputValue}`.split('.');
  return decimals.length <= digits;
};

/** Validates numeric input against integer, bound, and decimal precision constraints. */
export const isValidNumber = (
  inputValue: string | number | null | undefined,
  integer?: boolean,
  upperBound?: number,
  lowerBound?: number,
  digits: number = 2
): boolean => {
  const inputValueAsNumber = Number(inputValue);
  return (
    inputValue !== '' &&
    inputValue != null &&
    !Number.isNaN(inputValueAsNumber) &&
    Number.isFinite(inputValueAsNumber) &&
    (!integer || Number.isInteger(inputValueAsNumber)) &&
    (upperBound === undefined || inputValueAsNumber <= upperBound) &&
    (lowerBound === undefined || inputValueAsNumber >= lowerBound) &&
    areDecimalsValid(inputValue, integer ? 0 : digits)
  );
};

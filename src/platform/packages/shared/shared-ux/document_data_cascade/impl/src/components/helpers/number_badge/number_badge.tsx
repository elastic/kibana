/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText, type EuiTextProps } from '@elastic/eui';

const SI_PREFIXES_CENTER_INDEX = 8;

const siPrefixes: readonly string[] = [
  'y', // yocto
  'z', // zepto
  'a', // atto
  'f', // femto
  'p', // pico
  'n', // nano
  'μ', // micro
  'm', // milli
  '', // no prefix
  'k', // kilo
  'M', // mega
  'G', // giga
  'T', // tera
  'P', // peta
  'E', // exa
  'Z', // zetta
  'Y', // yotta
];

/**
 * Converts a number into a string representation using SI prefixes for large and small numbers.
 * For example, 1500 becomes "1.5k" and 0.0000012 becomes "1.2μ".
 * Informed by https://gist.github.com/cho45/9968462?permalink_comment_id=3522694#gistcomment-3522694
 */
export const getSiPrefixedNumber = (number: number): string => {
  if (number === 0) return number.toString();
  const EXP_STEP_SIZE = 3;
  const base = Math.floor(Math.log10(Math.abs(number)));
  const siBase = (base < 0 ? Math.ceil : Math.floor)(base / EXP_STEP_SIZE);
  const prefix = siPrefixes[siBase + SI_PREFIXES_CENTER_INDEX];

  // return number as-is if no prefix is available
  if (siBase === 0) return number.toString();

  // We're left with a number which needs to be divided by the power of 10e[base]
  // This outcome is then rounded two decimals and parsed as float to make sure those
  // decimals only appear when they're actually required (10.0 -> 10, 10.90 -> 19.9, 10.01 -> 10.01)
  const baseNumber = parseFloat((number / Math.pow(10, siBase * EXP_STEP_SIZE)).toFixed(2));
  return `${baseNumber}${prefix}`;
};

interface NumberBadgeProps extends Pick<EuiTextProps, 'textAlign'> {
  value: number;
  /**
   * If provided, shortens the number at the given length and adds ellipsis.
   * For example, a value of 1000 with shortenAt=3 will display as "1K".
   */
  shortenAtExpSize: number;
}

/**
 * A badge component to display numbers in a consistent way.
 */
export function NumberBadge({ value, shortenAtExpSize, textAlign = 'right' }: NumberBadgeProps) {
  return (
    <EuiText
      title={String(value)}
      textAlign={textAlign}
      css={{
        // width is 7ch accounts for at most 3 digits, a decimal point, possibly a SI prefix and floating point numbers fixed at 2
        width: '7ch',
        '& > *': {
          // force all numbers to have the same size, in turn ensuring that the defined width above
          // is always respected for all instance of this component that specify the same shortenAtExpSize value
          fontVariantNumeric: 'tabular-nums',
        },
      }}
    >
      <h5>
        {Math.floor(value / Math.pow(10, shortenAtExpSize)) >= 1
          ? getSiPrefixedNumber(value)
          : Number.isInteger(value)
          ? value
          : value.toFixed(2)}
      </h5>
    </EuiText>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { Fragment, type ReactNode } from 'react';
import { isFunction } from 'lodash';
import type { IFieldFormat, ReactContextTypeConvert } from '../types';

export const REACT_CONTEXT_TYPE = 'react';

/**
 * CSS class used for array delimiter highlighting in React output
 */
export const ARRAY_HIGHLIGHT_CLASS = 'ffArray__highlight';

/**
 * Component to render array delimiters with highlighting
 */
const ArrayDelimiter = ({ char }: { char: string }) => (
  <span className={ARRAY_HIGHLIGHT_CLASS}>{char}</span>
);

/**
 * Sets up React content type conversion for a field formatter.
 *
 * If the formatter provides a custom `reactConvert` function, it will be used.
 * Otherwise, returns undefined to indicate that React rendering is not available
 * for this formatter and consumers should use the legacy HTML path or adapter.
 *
 * This function handles array recursion, wrapping array values with visual
 * delimiters similar to how HTML content type handles arrays.
 *
 * @param format - The field format instance
 * @param reactContextTypeConvert - Optional custom React converter function
 * @returns A React converter function, or undefined if not available
 */
export const setup = (
  format: IFieldFormat,
  reactContextTypeConvert?: ReactContextTypeConvert
): ReactContextTypeConvert | undefined => {
  // If no custom React converter is provided, return undefined
  // This signals to consumers that they should use the legacy HTML adapter
  if (!reactContextTypeConvert) {
    return undefined;
  }

  const convert = reactContextTypeConvert;

  const recurse: ReactContextTypeConvert = (value, options = {}) => {
    if (!value || !isFunction(value.map)) {
      return convert.call(format, value, options);
    }

    // Format array values with delimiters
    const subValues: ReactNode[] = value.map((v: unknown, index: number) => {
      const formattedValue = recurse(v, options);
      return <Fragment key={index}>{formattedValue}</Fragment>;
    });

    // Check if any formatted values contain newlines (for multi-line formatting)
    // Since we're dealing with ReactNodes, we check by rendering to string
    // For simplicity, we use a heuristic: if the value is an object/array, use multi-line
    const useMultiLine = value.some(
      (v: unknown) => typeof v === 'object' && v !== null && !Array.isArray(v)
    );

    // Build the array with delimiters
    const result: ReactNode[] = [];
    subValues.forEach((formattedValue, index) => {
      if (index > 0) {
        result.push(<ArrayDelimiter key={`comma-${index}`} char="," />);
        if (useMultiLine) {
          result.push('\n');
        } else {
          result.push(' ');
        }
      }
      result.push(formattedValue);
    });

    // Wrap arrays with 2+ elements in brackets
    if (subValues.length >= 2) {
      if (useMultiLine) {
        return (
          <>
            <ArrayDelimiter char="[" />
            {'\n  '}
            {result}
            {'\n'}
            <ArrayDelimiter char="]" />
          </>
        );
      }
      return (
        <>
          <ArrayDelimiter char="[" />
          {result}
          <ArrayDelimiter char="]" />
        </>
      );
    }

    return <>{result}</>;
  };

  return recurse;
};

/**
 * Checks if a field format instance has React rendering support.
 *
 * @param format - The field format instance to check
 * @returns true if the format supports React rendering
 */
export const hasReactSupport = (format: IFieldFormat): boolean => {
  return 'reactConvert' in format && typeof (format as any).reactConvert === 'function';
};

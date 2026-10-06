/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { type FilterOperatorLiteral } from '../../../../../../utils/filter_input_codec';
export interface FilterInput {
  tagName: string;
  operator: FilterOperatorLiteral;
  tagValue: string[] | string | undefined;
}
interface FilterSelectionInputProps {
  form: UseFormReturn<FilterInput>;
  onFilterInputChanged: (filterInput: FilterInput) => void;
  /**
   * Business-rule validator invoked by RHF on submit (and on revalidation).
   * Return `true` when valid, or an error message string when invalid.
   * May be async when validating against the server.
   */
  validateExpression: (input: FilterInput) => true | string | Promise<true | string>;
  getFilteringDimensionsOptions: () => string[];
  getFilterValuesOptions: (anchor: Omit<Partial<FilterInput>, 'tagValue'>) => string[];
}
export declare function FilterSelectionInput({
  form,
  onFilterInputChanged,
  validateExpression,
  getFilteringDimensionsOptions,
  getFilterValuesOptions,
}: FilterSelectionInputProps): React.JSX.Element;
export {};

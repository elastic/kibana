/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { FilterExpressionValue } from '../../../../../utils/filter_input_codec';
/**
 * Describes a filter that is being edited in the filter form.
 */
export interface EditingFilter {
  id: string;
  expression: FilterExpressionValue;
  enabled: boolean;
}
export interface ProjectPickerFilterDisplayProps {
  currentFilterInputId?: string;
  onEditFilter: (filter: Pick<EditingFilter, 'id' | 'expression'> | null) => void;
}
export declare function ProjectPickerFilterDisplay({
  currentFilterInputId,
  onEditFilter,
}: ProjectPickerFilterDisplayProps): React.JSX.Element | null;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
export interface ProjectPickerFilterFormProps {
  /**
   * When set, saving updates the existing filter instead of creating a new one.
   */
  filterId?: string;
  /**
   * Callback to be called when the filter form should be closed.
   */
  onCloseFilterFormRequested?: () => void;
}
export declare function ProjectPickerFilterForm({
  filterId,
  onCloseFilterFormRequested,
}: ProjectPickerFilterFormProps): React.JSX.Element;

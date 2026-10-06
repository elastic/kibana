/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { EuiFlexGridProps } from '@elastic/eui';
/**
 * Props for the `SampleDataCards` component.
 */
export interface Props {
  /** Number of columns, defaults to 3. */
  columns?: EuiFlexGridProps['columns'];
}
/**
 * Fetches and displays a collection of Sample Data Sets in a grid.
 */
export declare const SampleDataCards: ({ columns }: Props) => React.JSX.Element;

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { SampleDataSet, InstalledStatus } from '@kbn/home-sample-data-types';
/**
 * Props for the `Footer` component.
 */
export interface Props {
  /** The Sample Data Set and its status. */
  sampleDataSet: SampleDataSet;
  /** The handler to invoke when an action is performed upon the Sample Data Set. */
  onAction: (id: string, status: InstalledStatus) => void;
}
/**
 * Displays the appropriate Footer component based on the status of the Sample Data Set.
 */
export declare const Footer: ({ sampleDataSet, onAction }: Props) => React.JSX.Element;

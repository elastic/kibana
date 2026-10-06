/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { SampleDataSet } from '@kbn/home-sample-data-types';
/**
 * Props for the `ViewButton` component.
 */
export type Props = Pick<SampleDataSet, 'id' | 'name' | 'overviewDashboard' | 'appLinks'>;
/**
 * A button displayed when a Sample Data Set is installed, allowing a person to view the overview dashboard,
 * and, if included, a number of actions to navigate to other solutions.
 */
export declare const ViewButton: ({
  id,
  name,
  overviewDashboard,
  appLinks,
}: Props) => React.JSX.Element;

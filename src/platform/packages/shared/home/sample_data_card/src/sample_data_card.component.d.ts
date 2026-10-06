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
export interface Props {
  /** A Sample Data Set to display. */
  sampleDataSet: SampleDataSet;
  /** A resolved, themed image to display in the card. */
  imagePath: string;
  /** A handler to invoke when the status of a Sample Data Set is changed. */
  onStatusChange: (id: string, status: InstalledStatus) => void;
}
/**
 * A pure implementation of the `SampleDataCard` component that itself
 * does not depend on any Kibana services.  Still requires a
 * `SampleDataCardProvider` for its dependencies to render and function.
 */
export declare const SampleDataCard: ({
  sampleDataSet,
  imagePath: image,
  onStatusChange: onAction,
}: Props) => React.JSX.Element;

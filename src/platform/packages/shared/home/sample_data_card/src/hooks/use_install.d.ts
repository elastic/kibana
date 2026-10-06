/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SampleDataSet } from '@kbn/home-sample-data-types';
/**
 * Parameters for the `useInstall` React hook.
 */
export type Params = Pick<SampleDataSet, 'id' | 'defaultIndex' | 'name'> & {
  /** Handler to invoke when the Sample Data Set is successfully installed. */
  onInstall: (id: string) => void;
};
/**
 * A React hook that allows a component to install a sample data set, handling success and
 * failure in the Kibana UI. It also provides a boolean that indicates if the data set is
 * in the process of being installed.
 *
 * After installation, this hook polls the status endpoint until the data is confirmed
 * as installed
 */
export declare const useInstall: ({
  id,
  defaultIndex,
  name,
  onInstall,
}: Params) => [() => void, boolean];

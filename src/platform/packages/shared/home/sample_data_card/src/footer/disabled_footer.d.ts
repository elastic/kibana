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
 * Props for the `DisabledFooter` component.
 */
export type Props = Pick<SampleDataSet, 'id' | 'name' | 'statusMsg'>;
/**
 * A footer for the `SampleDataCard` displayed when an unknown error or status prevents a person
 * from installing the Sample Data Set.
 */
export declare const DisabledFooter: ({ id, name, statusMsg }: Props) => React.JSX.Element;

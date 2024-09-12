/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { dynamic } from '@kbn/shared-ux-utility';
import React from 'react';
import type { SummaryColumnProps, SummaryColumnsGridParams } from './summary_column';

const SummaryColumn = dynamic(() => import('./summary_column'));

export const getSummaryColumn =
  ({ data, params }: { data: DataPublicPluginStart; params: SummaryColumnsGridParams }) =>
  (props: SummaryColumnProps) =>
    <SummaryColumn data={data} params={params} {...props} />;

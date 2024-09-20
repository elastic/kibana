/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { dynamic } from '@kbn/shared-ux-utility';
import { getShouldShowFieldHandler } from '@kbn/discover-utils';
import { DataView } from '@kbn/data-views-plugin/common';
import type { SummaryColumnFactoryDeps, SummaryColumnProps } from './summary_column';

const SummaryColumn = dynamic(() => import('./summary_column'));

export type SummaryColumnGetterDeps = Omit<SummaryColumnFactoryDeps, 'shouldShowFieldHandler'>;

export const getSummaryColumn = ({ data, params }: SummaryColumnGetterDeps) => {
  const { dataView } = params;
  const shouldShowFieldHandler = createGetShouldShowFieldHandler(dataView);

  return (props: SummaryColumnProps) => (
    <SummaryColumn
      data={data}
      params={params}
      shouldShowFieldHandler={shouldShowFieldHandler}
      {...props}
    />
  );
};

const createGetShouldShowFieldHandler = (dataView: DataView) => {
  const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
  return getShouldShowFieldHandler(dataViewFields, dataView, true);
};

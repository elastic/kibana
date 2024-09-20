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
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { CellRenderersExtensionParams } from '../../../../context_awareness';
import type { SummaryColumnProps } from './summary_column';

const SummaryColumn = dynamic(() => import('./summary_column'));

export interface SummaryColumnGetterDeps {
  data: DataPublicPluginStart;
  params: CellRenderersExtensionParams;
}

export const getSummaryColumn = ({ data, params }: SummaryColumnGetterDeps) => {
  const { dataView, density, rowHeight } = params;
  const shouldShowFieldHandler = createGetShouldShowFieldHandler(dataView);

  return (props: SummaryColumnProps) => (
    <SummaryColumn
      {...props}
      data={data}
      density={density}
      rowHeight={rowHeight}
      shouldShowFieldHandler={shouldShowFieldHandler}
    />
  );
};

const createGetShouldShowFieldHandler = (dataView: DataView) => {
  const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
  return getShouldShowFieldHandler(dataViewFields, dataView, true);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { getShouldShowFieldHandler } from '@kbn/discover-utils';
import { DataView } from '@kbn/data-views-plugin/common';
import {
  AllSummaryColumnProps,
  LazySummaryColumn,
  SummaryColumnProps,
} from '@kbn/discover-contextual-components';
import { CellRenderersExtensionParams } from '../../../context_awareness';
import { useDiscoverServices } from '../../../hooks/use_discover_services';

export type SummaryColumnGetterDeps = CellRenderersExtensionParams;

const SummaryColumn = (props: Omit<AllSummaryColumnProps, 'core' | 'share'>) => {
  const { share, core } = useDiscoverServices();
  return <LazySummaryColumn {...props} share={share} core={core} />;
};

export const getTracesSummaryColumn = (params: SummaryColumnGetterDeps) => {
  const { actions, dataView, density, rowHeight } = params;
  const shouldShowFieldHandler = createGetShouldShowFieldHandler(dataView);

  return (props: Omit<SummaryColumnProps, 'core' | 'share'>) => (
    <SummaryColumn
      {...props}
      isTracesSummary
      density={density}
      onFilter={actions.addFilter}
      rowHeight={rowHeight}
      shouldShowFieldHandler={shouldShowFieldHandler}
    />
  );
};

const createGetShouldShowFieldHandler = (dataView: DataView) => {
  const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
  return getShouldShowFieldHandler(dataViewFields, dataView, true);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { getShouldShowFieldHandler, SERVICE_NAME_FIELD } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type {
  AllSummaryColumnProps,
  RenderResourceBadge,
  SummaryColumnProps,
} from '@kbn/discover-contextual-components';
import { LazySummaryColumn } from '@kbn/discover-contextual-components';
import type { CellRenderersExtensionParams } from '../../../context_awareness';
import type { ContextAwarenessToolkit } from '../../../context_awareness';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { ServiceSummaryBadge } from '../../../context_awareness/profile_providers/observability/traces_data_source_profile/accessors/service_summary_cell';

export type SummaryColumnGetterDeps = CellRenderersExtensionParams;

const SummaryColumn = (props: Omit<AllSummaryColumnProps, 'core' | 'share'>) => {
  const { share, core } = useDiscoverServices();
  return <LazySummaryColumn {...props} share={share} core={core} />;
};

export const getTracesSummaryColumn = (
  params: SummaryColumnGetterDeps,
  toolkit: ContextAwarenessToolkit
) => {
  const { dataView, density, rowHeight } = params;
  const shouldShowFieldHandler = createGetShouldShowFieldHandler(dataView);

  // Render the service chip as the service-summary popover (same as the Service name column cell),
  // instead of the generic filter/copy cell-actions badge.
  const renderResourceBadge: RenderResourceBadge = ({ field, row }) =>
    field.name === SERVICE_NAME_FIELD ? (
      <ServiceSummaryBadge row={row} serviceNameField={field.name} toolkit={toolkit} />
    ) : undefined;

  return (props: Omit<SummaryColumnProps, 'core' | 'share'>) => (
    <SummaryColumn
      {...props}
      isTracesSummary
      density={density}
      onFilter={toolkit.actions.addFilter}
      rowHeight={rowHeight}
      shouldShowFieldHandler={shouldShowFieldHandler}
      renderResourceBadge={renderResourceBadge}
    />
  );
};

const createGetShouldShowFieldHandler = (dataView: DataView) => {
  const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
  return getShouldShowFieldHandler(dataViewFields, dataView, true);
};

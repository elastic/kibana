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
  SummaryColumnProps,
} from '@kbn/discover-contextual-components';
import { LazySummaryColumn } from '@kbn/discover-contextual-components';
import type { CellRenderersExtensionParams } from '../../../context_awareness';
import type { ContextAwarenessToolkit } from '../../../context_awareness';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import {
  createEntitySummaryBinding,
  createServiceSummaryDefinition,
  useEntitySummaryResourceBadge,
  type EntitySummaryFieldBinding,
} from '../entity_summary';

export type SummaryColumnGetterDeps = CellRenderersExtensionParams;

type SummaryColumnWrapperProps = Omit<
  AllSummaryColumnProps,
  'core' | 'share' | 'renderResourceBadge'
> & {
  bindings: EntitySummaryFieldBinding[];
};

const SummaryColumn = ({ bindings, ...props }: SummaryColumnWrapperProps) => {
  const { share, core } = useDiscoverServices();
  const renderResourceBadge = useEntitySummaryResourceBadge({ bindings });
  return (
    <LazySummaryColumn
      {...props}
      share={share}
      core={core}
      renderResourceBadge={renderResourceBadge}
    />
  );
};

export const getTracesSummaryColumn = (
  params: SummaryColumnGetterDeps,
  toolkit: ContextAwarenessToolkit
) => {
  const { dataView, density, rowHeight } = params;
  const shouldShowFieldHandler = createGetShouldShowFieldHandler(dataView);

  // Render the service chip as the service-summary popover (same as the Service name column cell),
  // instead of the generic filter/copy cell-actions badge.
  const bindings: EntitySummaryFieldBinding[] = [
    createEntitySummaryBinding({
      fields: [SERVICE_NAME_FIELD],
      definition: createServiceSummaryDefinition(),
      toolkit,
    }),
  ];

  return (props: Omit<SummaryColumnProps, 'core' | 'share'>) => (
    <SummaryColumn
      {...props}
      isTracesSummary
      density={density}
      onFilter={toolkit.actions.addFilter}
      rowHeight={rowHeight}
      shouldShowFieldHandler={shouldShowFieldHandler}
      bindings={bindings}
    />
  );
};

const createGetShouldShowFieldHandler = (dataView: DataView) => {
  const dataViewFields = dataView.fields.getAll().map((fld) => fld.name);
  return getShouldShowFieldHandler(dataViewFields, dataView, true);
};

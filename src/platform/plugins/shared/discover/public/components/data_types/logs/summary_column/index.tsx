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
import type { CellRenderersExtensionParams } from '../../../../context_awareness';
import type { ContextAwarenessToolkit } from '../../../../context_awareness';
import {
  createEntitySummaryBinding,
  createServiceSummaryDefinition,
  useEntitySummaryResourceBadge,
  type EntitySummaryFieldBinding,
} from '../../entity_summary';
import { SummaryColumn } from './summary_column';

export type SummaryColumnGetterDeps = CellRenderersExtensionParams;

type LogsSummaryColumnProps = Omit<
  AllSummaryColumnProps,
  'core' | 'share' | 'renderResourceBadge'
> & {
  bindings: EntitySummaryFieldBinding[];
};

const LogsSummaryColumn = ({ bindings, ...props }: LogsSummaryColumnProps) => {
  const renderResourceBadge = useEntitySummaryResourceBadge({ bindings });
  return <SummaryColumn {...props} renderResourceBadge={renderResourceBadge} />;
};

export const getSummaryColumn = (
  params: SummaryColumnGetterDeps,
  toolkit: ContextAwarenessToolkit
) => {
  const { dataView, density, rowHeight } = params;
  const shouldShowFieldHandler = createGetShouldShowFieldHandler(dataView);

  // Render the service chip as the service-summary popover (same as the traces profile), instead
  // of the generic filter/copy cell-actions badge.
  const bindings: EntitySummaryFieldBinding[] = [
    createEntitySummaryBinding({
      fields: [SERVICE_NAME_FIELD],
      definition: createServiceSummaryDefinition(),
      toolkit,
    }),
  ];

  return (props: Omit<SummaryColumnProps, 'core' | 'share'>) => (
    <LogsSummaryColumn
      {...props}
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

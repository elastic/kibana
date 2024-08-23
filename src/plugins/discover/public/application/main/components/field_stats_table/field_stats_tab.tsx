/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useQuerySubscriber } from '@kbn/unified-field-list/src/hooks/use_query_subscriber';
import { FieldStatisticsTable, type FieldStatisticsTableProps } from './field_stats_table';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useAdditionalFieldGroups } from '../../hooks/sidebar/use_additional_field_groups';

export const FieldStatisticsTab: React.FC<Omit<FieldStatisticsTableProps, 'query' | 'filters'>> =
  React.memo((props) => {
    const services = useDiscoverServices();
    const { query, filters } = useQuerySubscriber({
      data: services.data,
    });
    const additionalFieldGroups = useAdditionalFieldGroups();

    if (!services.dataVisualizer) return null;
    return (
      <FieldStatisticsTable
        dataView={props.dataView}
        columns={props.columns}
        stateContainer={props.stateContainer}
        onAddFilter={props.onAddFilter}
        trackUiMetric={props.trackUiMetric}
        isEsqlMode={props.isEsqlMode}
        query={query}
        filters={filters}
        additionalFieldGroups={additionalFieldGroups}
      />
    );
  });

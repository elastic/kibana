/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import {
  FieldStats,
  FieldStatsProps,
  useQuerySubscriber,
  hasQuerySubscriberData,
} from '@kbn/unified-field-list-plugin/public';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/public';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

export interface DiscoverFieldStatsProps {
  field: DataViewField;
  dataView: DataView;
  multiFields?: Array<{ field: DataViewField; isSelected: boolean }>;
  onAddFilter: FieldStatsProps['onAddFilter'];
}

export const DiscoverFieldStats: React.FC<DiscoverFieldStatsProps> = React.memo(
  ({ field, dataView, multiFields, onAddFilter }) => {
    const services = useDiscoverServices();
    const querySubscriberResult = useQuerySubscriber({
      data: services.data,
    });
    // prioritize an aggregatable multi field if available or take the parent field
    const fieldForStats = useMemo(
      () =>
        (multiFields?.length &&
          multiFields.find((multiField) => multiField.field.aggregatable)?.field) ||
        field,
      [field, multiFields]
    );

    if (!hasQuerySubscriberData(querySubscriberResult)) {
      return null;
    }

    return (
      <FieldStats
        services={services}
        query={querySubscriberResult.query}
        filters={querySubscriberResult.filters}
        fromDate={querySubscriberResult.fromDate}
        toDate={querySubscriberResult.toDate}
        dataViewOrDataViewId={dataView}
        field={fieldForStats}
        data-test-subj="dscFieldStats"
        onAddFilter={onAddFilter}
      />
    );
  }
);

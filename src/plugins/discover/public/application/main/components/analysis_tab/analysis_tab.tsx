/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, memo } from 'react';
import { useQuerySubscriber } from '@kbn/unified-field-list-plugin/public';
import { useSavedSearch } from '../../services/discover_state_provider';
import type { FieldStatisticsTableProps } from '../field_stats_table';
import { ExplainLogRateSpikesView } from './explain_log_rate_spikes_view';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

export const AnalysisTab: FC<Omit<FieldStatisticsTableProps, 'query' | 'filters'>> = memo(
  (props) => {
    const services = useDiscoverServices();
    const querySubscriberResult = useQuerySubscriber({
      data: services.data,
    });
    const savedSearch = useSavedSearch();

    return (
      <ExplainLogRateSpikesView
        {...props}
        savedSearch={savedSearch}
        query={querySubscriberResult.query}
        filters={querySubscriberResult.filters}
      />
    );
  }
);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { useQuerySubscriber } from '@kbn/unified-field-list/src/hooks/use_query_subscriber';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useSavedSearch } from '../../services/discover_state_provider';
import {
  LogCategorizationTable,
  type LogCategorizationTableProps,
} from './log_categorization_table';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';

export const LogCategorizationTab: React.FC<
  Omit<LogCategorizationTableProps, 'query' | 'filters' | 'setOptionsMenu'>
> = React.memo((props) => {
  const services = useDiscoverServices();
  const querySubscriberResult = useQuerySubscriber({
    data: services.data,
  });
  const savedSearch = useSavedSearch();
  const [optionsMenu, setOptionsMenu] = React.useState<React.ReactElement | undefined>(undefined);

  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="none">
          <EuiFlexItem grow={false}>{props.viewModeToggle}</EuiFlexItem>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>{optionsMenu}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <LogCategorizationTable
        {...props}
        savedSearch={savedSearch}
        query={querySubscriberResult.query}
        filters={querySubscriberResult.filters}
        setOptionsMenu={setOptionsMenu}
      />
    </>
  );
});

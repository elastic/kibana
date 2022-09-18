/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import {
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { useSelector } from '@xstate/react';
import React, { memo } from 'react';
import { EntriesActorRef, selectIsReloading } from '../../state_machines/entries_state_machine';
import { LogExplorerDiscoverGrid } from '../log_explorer_grid/log_explorer_discover_grid';

const LogExplorerDiscoverGridMemoized = React.memo(LogExplorerDiscoverGrid);

function LogExplorerComponent({
  savedSearch,
  stateMachine,
}: {
  savedSearch: SavedSearch;
  stateMachine: EntriesActorRef;
}) {
  const isReloading = useSelector(stateMachine, selectIsReloading);

  if (isReloading) {
    return (
      <div className="dscDocuments__loading">
        <EuiText size="xs" color="subdued">
          <EuiLoadingSpinner />
          <EuiSpacer size="s" />
          <FormattedMessage id="discover.loadingDocuments" defaultMessage="Loading documents" />
        </EuiText>
      </div>
    );
  }

  return (
    <EuiFlexItem className="dscTable" aria-labelledby="documentsAriaLabel">
      <EuiScreenReaderOnly>
        <h2 id="documentsAriaLabel">
          <FormattedMessage id="discover.documentsAriaLabel" defaultMessage="Documents" />
        </h2>
      </EuiScreenReaderOnly>
      <div className="dscDiscoverGrid">
        <LogExplorerDiscoverGridMemoized savedSearch={savedSearch} />
      </div>
    </EuiFlexItem>
  );
}

export const LogExplorer = memo(LogExplorerComponent);

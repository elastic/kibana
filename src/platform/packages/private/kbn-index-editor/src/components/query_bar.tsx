/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSearchBar,
  EuiText,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { FormattedMessage } from '@kbn/i18n-react';
import { FilePicker } from './file_picker';
import type { EditLookupIndexContentContext, KibanaContextExtra } from '../types';

export const QueryBar = ({
  onOpenIndexInDiscover,
}: {
  onOpenIndexInDiscover?: EditLookupIndexContentContext['onOpenIndexInDiscover'];
}) => {
  const {
    services: { share, data, indexUpdateService, indexEditorTelemetryService, featureFlags },
  } = useKibana<KibanaContextExtra>();

  const dataView = useObservable(indexUpdateService.dataView$);
  const esqlDiscoverQuery = useObservable(indexUpdateService.esqlDiscoverQuery$, '');
  const searchQuery = useObservable(indexUpdateService.qstr$, '');
  const isIndexCreated = useObservable(
    indexUpdateService.indexCreated$,
    indexUpdateService.isIndexCreated()
  );
  const indexName = useObservable(indexUpdateService.indexName$, null);

  const [queryError, setQueryError] = useState<string>('');

  const discoverLocator = useMemo(() => {
    return share?.url.locators.get('DISCOVER_APP_LOCATOR');
  }, [share?.url.locators]);

  const areTabsEnabled = useMemo(
    () => featureFlags?.getBooleanValue('discover.tabsEnabled', true) ?? true,
    [featureFlags]
  );

  // Only used as fallback if onOpenIndexInDiscover is not provided or tabs are disabled
  const discoverLink =
    isIndexCreated && esqlDiscoverQuery
      ? discoverLocator?.getRedirectUrl({
          timeRange: data.query.timefilter.timefilter.getTime(),
          query: {
            esql: esqlDiscoverQuery,
          },
        })
      : null;

  const openInDiscover = useCallback(
    async (e: React.MouseEvent) => {
      indexEditorTelemetryService.trackQueryThisIndexClicked(searchQuery);

      // If onOpenIndexInDiscover is provided, we let that handler to manage the navigation to Discover
      // If not, the button href will be executed
      if (areTabsEnabled && onOpenIndexInDiscover && indexName && esqlDiscoverQuery) {
        e.preventDefault();
        const onExitCallback = () => onOpenIndexInDiscover(indexName, esqlDiscoverQuery);
        indexUpdateService.exit(onExitCallback);
      }
    },
    [
      indexEditorTelemetryService,
      searchQuery,
      areTabsEnabled,
      onOpenIndexInDiscover,
      indexName,
      esqlDiscoverQuery,
      indexUpdateService,
    ]
  );

  if (!dataView) {
    return null;
  }

  return (
    <EuiFlexGroup alignItems={'flexStart'} gutterSize={'s'}>
      <EuiFlexItem grow>
        <EuiFormRow isInvalid={!!queryError} error={queryError} fullWidth>
          <EuiSearchBar
            defaultQuery={''}
            box={{
              'data-test-subj': 'indexEditorQueryBar',
              disabled: !isIndexCreated,
              compressed: true,
            }}
            onChange={({ queryText, error }) => {
              if (error) {
                setQueryError(error.message);
              } else {
                setQueryError('');
                indexUpdateService.setQstr(queryText);
              }
            }}
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <FilePicker />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          size="s"
          color="text"
          isDisabled={!isIndexCreated || !esqlDiscoverQuery}
          onClick={openInDiscover}
          href={discoverLink || undefined}
          target="_blank"
          iconType="discoverApp"
        >
          <EuiText size="xs">
            <FormattedMessage
              id="esqlDataGrid.openInDiscoverLabel"
              defaultMessage="Open in Discover"
            />
          </EuiText>
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

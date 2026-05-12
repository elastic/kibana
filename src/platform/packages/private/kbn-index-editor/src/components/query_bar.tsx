/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSearchBar,
  EuiToolTip,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import type { EditLookupIndexContentContext, KibanaContextExtra } from '../types';

const openInDiscoverTooltip = i18n.translate('indexEditor.toolbar.openInDiscoverTooltip', {
  defaultMessage: 'Open in Discover',
});

export const QueryBar = ({
  onOpenIndexInDiscover,
}: {
  onOpenIndexInDiscover?: EditLookupIndexContentContext['onOpenIndexInDiscover'];
}) => {
  const {
    services: { share, data, indexUpdateService, indexEditorTelemetryService },
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

  // Only used as fallback if onOpenIndexInDiscover is not provided
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
    (e: React.MouseEvent) => {
      indexEditorTelemetryService.trackQueryThisIndexClicked(searchQuery);

      // If onOpenIndexInDiscover is provided, we let that handler to manage the navigation to Discover
      // If not, the button href will be executed
      if (onOpenIndexInDiscover && indexName && esqlDiscoverQuery) {
        e.preventDefault();
        const onExitCallback = () => onOpenIndexInDiscover(indexName, esqlDiscoverQuery);
        indexUpdateService.exit(onExitCallback);
      }
    },
    [
      indexEditorTelemetryService,
      searchQuery,
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
              placeholder: i18n.translate('indexEditor.queryBar.placeholder', {
                defaultMessage: 'Type to filter...',
              }),
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
        <EuiToolTip content={openInDiscoverTooltip} disableScreenReaderOutput>
          <EuiButtonIcon
            size="s"
            color="text"
            display="base"
            isDisabled={!isIndexCreated || !esqlDiscoverQuery}
            onClick={openInDiscover}
            href={discoverLink || undefined}
            target="_blank"
            iconType="discoverApp"
            aria-label={openInDiscoverTooltip}
            data-test-subj="indexEditorOpenInDiscoverButton"
          />
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

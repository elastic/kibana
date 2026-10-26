/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { i18n } from '@kbn/i18n';
import type { Query } from '@kbn/es-query';
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
    services: { share, data, indexUpdateService, indexEditorTelemetryService, kql },
  } = useKibana<KibanaContextExtra>();

  const KQLComponent = kql.QueryStringInput;
  const dataView = useObservable(indexUpdateService.dataView$);
  const esqlDiscoverQuery = useObservable(indexUpdateService.esqlDiscoverQuery$, '');
  const filterQuery = useObservable<Query>(indexUpdateService.filterQuery$, {
    query: '',
    language: 'kuery',
  });
  const isIndexCreated = useObservable(
    indexUpdateService.indexCreated$,
    indexUpdateService.isIndexCreated()
  );
  const indexName = useObservable(indexUpdateService.indexName$, null);

  const [kqlQuery, setKqlQuery] = useState<Query>({ query: '', language: 'kuery' });

  const indexPatterns = useMemo(() => (dataView ? [dataView] : []), [dataView]);

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
      indexEditorTelemetryService.trackQueryThisIndexClicked(
        typeof filterQuery.query === 'string' ? filterQuery.query : ''
      );

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
      filterQuery.query,
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
      <EuiFlexItem grow css={{ minWidth: 200 }}>
        <KQLComponent
          isDisabled={!isIndexCreated}
          disableLanguageSwitcher
          disableAutoFocus
          autoSubmit
          indexPatterns={indexPatterns}
          bubbleSubmitEvent={false}
          query={kqlQuery}
          placeholder={i18n.translate('indexEditor.queryBar.placeholder', {
            defaultMessage: 'Filter your data using KQL',
          })}
          onChange={setKqlQuery}
          onSubmit={(newQuery: Query) => {
            indexUpdateService.setFilterQuery(newQuery);
          }}
          appName="esqlIndexEditor"
          dataTestSubj="indexEditorQueryBar"
          size="s"
        />
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

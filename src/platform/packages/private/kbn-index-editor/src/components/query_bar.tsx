/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
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
import type { KibanaContextExtra } from '../types';

export const QueryBar = () => {
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

  const [queryError, setQueryError] = useState<string>('');

  const discoverLocator = useMemo(() => {
    return share?.url.locators.get('DISCOVER_APP_LOCATOR');
  }, [share?.url.locators]);

  const discoverLink =
    isIndexCreated && esqlDiscoverQuery
      ? discoverLocator?.getRedirectUrl({
          timeRange: data.query.timefilter.timefilter.getTime(),
          query: {
            esql: esqlDiscoverQuery,
          },
        })
      : null;

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
          size={'s'}
          color={'text'}
          isDisabled={!discoverLink}
          href={discoverLink ?? undefined}
          onClick={() => indexEditorTelemetryService.trackQueryThisIndexClicked(searchQuery)}
          target="_blank"
          iconType={'discoverApp'}
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

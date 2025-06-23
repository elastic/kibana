/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { FilePicker } from './file_picker';
import { KibanaContextExtra } from '../types';

export const CustomPanel = () => {
  const {
    services: { share, data, indexUpdateService },
  } = useKibana<KibanaContextExtra>();

  const dataViewColumns = useObservable(indexUpdateService.dataTableColumns$);
  const dataView = useObservable(indexUpdateService.dataView$);

  const activeColumns = useMemo(() => {
    return dataViewColumns?.map((c) => c.name);
  }, [dataViewColumns]);

  const discoverLocator = useMemo(() => {
    return share?.url.locators.get('DISCOVER_APP_LOCATOR');
  }, [share?.url.locators]);

  const discoverLink = dataView
    ? discoverLocator?.getRedirectUrl({
        timeRange: data.query.timefilter.timefilter.getTime(),
        query: {
          esql: `FROM ${dataView.getIndexPattern()} | LIMIT ${10}`,
        },
        columns: activeColumns,
      })
    : null;

  if (!discoverLink) return null;

  return (
    <EuiFlexGroup alignItems={'center'} gutterSize={'s'}>
      <EuiFlexItem grow={false}>
        <FilePicker />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton
          fill
          size={'s'}
          color={'text'}
          href={discoverLink}
          target="_blank"
          iconType={'discoverApp'}
        >
          <EuiText size="xs">
            {i18n.translate('esqlDataGrid.openInDiscoverLabel', {
              defaultMessage: 'Query this index',
            })}
          </EuiText>
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataViewPicker } from '@kbn/unified-search-plugin/public';
import { useInternalStateSelector } from '../../state_management/redux';

export const MissingDataViewPrompt = ({
  missingDataViewId,
  adHocDataViews,
  onSelectDataView,
  onDataViewCreated,
}: {
  missingDataViewId: string;
  adHocDataViews: DataView[];
  onSelectDataView: (dataViewId: string) => void;
  onDataViewCreated: (dataView: DataView) => void;
}) => {
  const savedDataViews = useInternalStateSelector((state) => state.savedDataViews);

  return (
    <EuiEmptyPrompt
      data-test-subj="discoverMissingDataViewPrompt"
      paddingSize="l"
      iconType="warning"
      iconColor="danger"
      title={
        <h2>
          {i18n.translate('discover.missingDataViewPrompt.title', {
            defaultMessage: 'Data view not found',
          })}
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="discover.missingDataViewPrompt.description"
            defaultMessage="The data view with ID {dataViewId} used by this tab can't be found. Select a different data view to continue."
            values={{ dataViewId: <strong>{missingDataViewId}</strong> }}
          />
        </p>
      }
      actions={
        <EuiFlexGroup justifyContent="center">
          <EuiFlexItem grow={false}>
            <DataViewPicker
              trigger={{
                label: i18n.translate('discover.missingDataViewPrompt.selectDataViewLabel', {
                  defaultMessage: 'Select a data view',
                }),
                'data-test-subj': 'discoverMissingDataViewPicker',
              }}
              isMissingCurrent
              savedDataViews={savedDataViews}
              adHocDataViews={adHocDataViews}
              onChangeDataView={onSelectDataView}
              onDataViewCreated={onDataViewCreated}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};

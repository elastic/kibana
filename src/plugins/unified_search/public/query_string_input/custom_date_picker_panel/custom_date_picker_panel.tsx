/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import dateMath from '@kbn/datemath';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EuiLink, EuiFlexGrid, EuiFlexItem, ApplyTime } from '@elastic/eui';
import type { IUnifiedSearchPluginServices } from '../../types';
import { getHistoricalRange } from './get_historical_range';

export interface Props {
  currentDataViewId: string;
  applyTime?: ApplyTime;
}

export const CustomDatePickerPanel: React.FC<Props> = ({ currentDataViewId, applyTime }) => {
  const { data } = useKibana<IUnifiedSearchPluginServices>().services;

  const applyTimeRange = useCallback(
    async (type: 'all' | 'first' | 'last') => {
      const dataView = await data.dataViews.get(currentDataViewId);
      const historicalRange = await getHistoricalRange(data, dataView);

      if (historicalRange?.from && historicalRange?.to) {
        switch (type) {
          case 'all':
            applyTime!({ start: historicalRange?.from, end: historicalRange?.to });
            break;
          case 'first':
            applyTime!({
              start: historicalRange?.from,
              end: dateMath.parse(historicalRange?.from)!.add(24, 'hours').toISOString(),
            });
            break;
          case 'last':
            applyTime!({
              start: dateMath.parse(historicalRange?.to)!.subtract(24, 'hours').toISOString(),
              end: historicalRange?.to,
            });
            break;
          default:
            break;
        }
      }
    },
    [applyTime, currentDataViewId, data]
  );

  return (
    <EuiFlexGrid gutterSize="s" columns={2} direction="column" responsive={false}>
      <EuiFlexItem className="euiQuickSelectPopover__sectionItem">
        <EuiLink
          onClick={() => applyTimeRange('first')}
          data-test-subj="superDatePickerCustomPanel_First_24_hours"
        >
          <FormattedMessage
            id="unifiedSearch.queryBarTopRow.customQuickSelectDatePickerPanel.first24hLinkText"
            defaultMessage="First 24 hours"
          />
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem className="euiQuickSelectPopover__sectionItem">
        <EuiLink
          onClick={() => applyTimeRange('last')}
          data-test-subj="superDatePickerCustomPanel_Last_24_hours"
        >
          <FormattedMessage
            id="unifiedSearch.queryBarTopRow.customQuickSelectDatePickerPanel.last24hLinkText"
            defaultMessage="Last 24 hours"
          />
        </EuiLink>
      </EuiFlexItem>
      <EuiFlexItem className="euiQuickSelectPopover__sectionItem">
        <EuiLink
          onClick={() => applyTimeRange('all')}
          data-test-subj="superDatePickerCustomPanel_Historical"
        >
          <FormattedMessage
            id="unifiedSearch.queryBarTopRow.customQuickSelectDatePickerPanel.wholePeriodLinkText"
            defaultMessage="Historical period"
          />
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};

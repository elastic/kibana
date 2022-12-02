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
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { EuiLink, EuiFlexGrid, EuiFlexItem, ApplyTime } from '@elastic/eui';
import { getDocumentsTimeRange } from './get_documents_time_range';

/**
 * Props of the custom panel
 */
export interface Props {
  data: DataPublicPluginStart;
  currentDataViewId: string;
  applyTime?: ApplyTime; // will be injected by Eui
}

/**
 * A panel with custom quick date picker ranges
 * @param data
 * @param currentDataViewId
 * @param applyTime
 */
export const CustomDatePickerPanel: React.FC<Props> = ({ data, currentDataViewId, applyTime }) => {
  const applyTimeRange = useCallback(
    async (type: 'all' | 'first' | 'last') => {
      const dataView = await data.dataViews.get(currentDataViewId);
      const historicalRange = await getDocumentsTimeRange({ data, dataView });

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
            defaultMessage="Historical range"
          />
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGrid>
  );
};

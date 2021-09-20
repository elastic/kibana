/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiToolTip, EuiText } from '@elastic/eui';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import dateMath from '@elastic/datemath';
import './timechart_header.scss';
import { DataPublicPluginStart } from '../../../../../../../data/public';
import { DataCharts$, DataChartsMessage } from '../../services/use_saved_search';
import { useDataState } from '../../utils/use_data_state';

export interface TimechartBucketInterval {
  scaled?: boolean;
  description?: string;
  scale?: number;
}

export interface TimechartHeaderProps {
  /**
   * Format of date to be displayed
   */
  dateFormat?: string;

  data: DataPublicPluginStart;
  /**
   * selected interval
   */
  stateInterval: string;

  savedSearchData$: DataCharts$;
}

export function TimechartHeader({
  dateFormat,
  data: dataPluginStart,
  savedSearchData$,
}: TimechartHeaderProps) {
  const { timefilter } = dataPluginStart.query.timefilter;

  const data: DataChartsMessage = useDataState(savedSearchData$);

  const { bucketInterval } = data;
  const { from, to } = timefilter.getTime();
  const timeRange = {
    from: dateMath.parse(from),
    to: dateMath.parse(to, { roundUp: true }),
  };
  const toMoment = useCallback(
    (datetime: moment.Moment | undefined) => {
      if (!datetime) {
        return '';
      }
      if (!dateFormat) {
        return String(datetime);
      }
      return datetime.format(dateFormat);
    },
    [dateFormat]
  );

  if (!timeRange || !bucketInterval) {
    return null;
  }

  return (
    <EuiFlexGroup
      className="dscTimeChartHeader"
      gutterSize="s"
      responsive={false}
      wrap
      justifyContent="center"
      alignItems="center"
    >
      <EuiFlexItem grow={false} className="eui-hideFor--m">
        <EuiToolTip
          content={i18n.translate('discover.howToChangeTheTimeTooltip', {
            defaultMessage: 'To change the time, use the global time filter.',
          })}
          delay="long"
        >
          <EuiText data-test-subj="discoverIntervalDateRange" textAlign="center" size="s">
            {`${toMoment(timeRange.from)} - ${toMoment(timeRange.to)}`}
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

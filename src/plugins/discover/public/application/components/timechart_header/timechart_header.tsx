/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiText,
  EuiSelect,
  EuiIconTip,
} from '@elastic/eui';
import moment from 'moment';
import { i18n } from '@kbn/i18n';
import dateMath from '@elastic/datemath';
import { DataPublicPluginStart } from '../../../../../data/public';
import './timechart_header.scss';

export interface TimechartHeaderProps {
  /**
   * Format of date to be displayed
   */
  dateFormat?: string;
  /**
   * Interval for the buckets of the recent request
   */
  bucketInterval?: {
    scaled?: boolean;
    description?: string;
    scale?: number;
  };
  data: DataPublicPluginStart;
  /**
   * Interval Options
   */
  options: Array<{ display: string; val: string }>;
  /**
   * changes the interval
   */
  onChangeInterval: (interval: string) => void;
  /**
   * selected interval
   */
  stateInterval: string;
}

export function TimechartHeader({
  bucketInterval,
  dateFormat,
  data,
  options,
  onChangeInterval,
  stateInterval,
}: TimechartHeaderProps) {
  const { timefilter } = data.query.timefilter;
  const { from, to } = timefilter.getTime();
  const timeRange = {
    from: dateMath.parse(from),
    to: dateMath.parse(to, { roundUp: true }),
  };
  const [interval, setInterval] = useState(stateInterval);
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

  useEffect(() => {
    setInterval(stateInterval);
  }, [stateInterval]);

  const handleIntervalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setInterval(e.target.value);
    onChangeInterval(e.target.value);
  };

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
            {`${toMoment(timeRange.from)} - ${toMoment(timeRange.to)} ${
              interval !== 'auto'
                ? i18n.translate('discover.timechartHeader.timeIntervalSelect.per', {
                    defaultMessage: 'per',
                  })
                : ''
            }`}
          </EuiText>
        </EuiToolTip>
      </EuiFlexItem>
      <EuiFlexItem className="dscTimeIntervalSelect" grow={false}>
        <EuiSelect
          aria-label={i18n.translate('discover.timechartHeader.timeIntervalSelect.ariaLabel', {
            defaultMessage: 'Time interval',
          })}
          compressed
          id="dscResultsIntervalSelector"
          data-test-subj="discoverIntervalSelect"
          options={options
            .filter(({ val }) => val !== 'custom')
            .map(({ display, val }) => {
              return {
                text: display,
                value: val,
                label: display,
              };
            })}
          value={interval}
          onChange={handleIntervalChange}
          append={
            bucketInterval.scaled ? (
              <EuiIconTip
                id="discoverIntervalIconTip"
                content={i18n.translate('discover.bucketIntervalTooltip', {
                  defaultMessage:
                    'This interval creates {bucketsDescription} to show in the selected time range, so it has been scaled to {bucketIntervalDescription}.',
                  values: {
                    bucketsDescription:
                      bucketInterval!.scale && bucketInterval!.scale > 1
                        ? i18n.translate('discover.bucketIntervalTooltip.tooLargeBucketsText', {
                            defaultMessage: 'buckets that are too large',
                          })
                        : i18n.translate('discover.bucketIntervalTooltip.tooManyBucketsText', {
                            defaultMessage: 'too many buckets',
                          }),
                    bucketIntervalDescription: bucketInterval.description,
                  },
                })}
                color="warning"
                size="s"
                type="alert"
              />
            ) : undefined
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

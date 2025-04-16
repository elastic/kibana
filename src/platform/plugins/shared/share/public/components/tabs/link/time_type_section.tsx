/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiSpacer, EuiSwitch, EuiSwitchEvent, EuiText, useEuiTheme } from '@elastic/eui';
import React, { ReactNode, useEffect, useState } from 'react';
import { FormattedMessage, FormattedRelativeTime, FormattedDate } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  convertRelativeTimeStringToAbsoluteTimeDate,
  getRelativeTimeValueAndUnitFromTimeString,
  isTimeRangeAbsoluteTime,
} from '../../../lib/time_utils';

const BoldText = ({ children }: { children: ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  const boldText = css`
    font-weight: ${euiTheme.font.weight.bold};
  `;

  return (
    <EuiText css={boldText} component="span" size="s">
      {children}
    </EuiText>
  );
};

const AbsoluteTimeText = ({ date }: { date: string }) => {
  const absoluteDate = convertRelativeTimeStringToAbsoluteTimeDate(date);

  return (
    <BoldText>
      <FormattedDate
        value={absoluteDate}
        year="numeric"
        month="long"
        day="2-digit"
        hour="numeric"
        minute="numeric"
        hour12
      />
    </BoldText>
  );
};

const RelativeTimeText = ({ date }: { date: string }) => {
  const result = getRelativeTimeValueAndUnitFromTimeString(date);

  return (
    <BoldText>
      <FormattedRelativeTime
        value={result?.value}
        // @ts-expect-error - RelativeTimeFormatSingularUnit expected here is not exported so a cast from string is not possible
        unit={result?.unit}
      />
    </BoldText>
  );
};

interface Props {
  timeRange?: {
    from: string;
    to: string;
  };
  isAbsoluteTime: boolean;
  changeTimeType: (e: EuiSwitchEvent) => void;
}

export const TimeTypeSection = ({ timeRange, isAbsoluteTime, changeTimeType }: Props) => {
  const [isAbsoluteTimeByDefault, setIsAbsoluteTimeByDefault] = useState(false);

  useEffect(() => {
    setIsAbsoluteTimeByDefault(isTimeRangeAbsoluteTime(timeRange));
  }, [timeRange]);

  if (!timeRange) {
    return null;
  }

  return (
    <>
      <EuiSwitch
        label={i18n.translate('share.link.timeRange.switchLabel', {
          defaultMessage: 'Use absolute time range',
        })}
        checked={isAbsoluteTime}
        disabled={isAbsoluteTimeByDefault}
        onChange={changeTimeType}
      />
      <EuiSpacer size="m" />
      <EuiText size="s">
        {isAbsoluteTime ? (
          <FormattedMessage
            id="share.link.timeRange.absoluteTimeInfoText"
            defaultMessage="The users will see all data from {from} to {to}."
            values={{
              from: <AbsoluteTimeText date={timeRange?.from} />,
              to: <AbsoluteTimeText date={timeRange?.to} />,
            }}
          />
        ) : (
          <FormattedMessage
            id="share.link.timeRange.relativeTimeInfoText"
            defaultMessage="The users will see all data from {from} to {to}, based on when they view it."
            values={{
              from: <RelativeTimeText date={timeRange?.from} />,
              to: <RelativeTimeText date={timeRange?.to} />,
            }}
          />
        )}
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );
};

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
import dateMath from '@kbn/datemath';
import moment from 'moment';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const getParsedDates = (isAbsolute: boolean, from?: string, to?: string) => {
  const fromParsed = dateMath.parse(from || '');
  const toParsed = dateMath.parse(to || '');

  const fromDate = fromParsed?.isValid() ? fromParsed.toDate() : moment(from).toDate();
  const toDate = toParsed?.isValid() ? toParsed.toDate() : moment(to).toDate();

  if (isAbsolute) return { from: fromDate, to: toDate };

  const now = Date.now();
  const fromDiff = Math.round((fromDate.getTime() - now) / 1000);
  const toDiff = Math.round((toDate.getTime() - now) / 1000);
  return { from: fromDiff, to: toDiff };
};

const BoldText = ({ text }: { text: ReactNode }) => {
  const { euiTheme } = useEuiTheme();
  const boldText = css`
    font-weight: ${euiTheme.font.weight.bold};
  `;

  return (
    <EuiText css={boldText} component="span" size="s">
      {text}
    </EuiText>
  );
};

const AbsoluteTimeText = ({ date }: { date: Date }) => (
  <FormattedDate
    value={date}
    year="numeric"
    month="long"
    day="2-digit"
    hour="numeric"
    minute="numeric"
    hour12
  />
);

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
  const { from, to } = getParsedDates(isAbsoluteTime, timeRange?.from, timeRange?.to);

  useEffect(() => {
    setIsAbsoluteTimeByDefault(
      !(timeRange?.from?.includes('now') || timeRange?.to?.includes('now'))
    );
  }, [timeRange]);

  if (!from || !to) {
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
              from: <BoldText text={<AbsoluteTimeText date={from as Date} />} />,
              to: <BoldText text={<AbsoluteTimeText date={to as Date} />} />,
            }}
          />
        ) : (
          <FormattedMessage
            id="share.link.timeRange.relativeTimeInfoText"
            defaultMessage="The users will see all data from {from} to {to}, based on when they view it."
            values={{
              // Without updateIntervalInSeconds, you need to specify the time unit, which is not possible here since the unit is dynamic
              from: (
                <BoldText
                  text={
                    <FormattedRelativeTime value={from as number} updateIntervalInSeconds={60} />
                  }
                />
              ),
              to: (
                <BoldText
                  text={<FormattedRelativeTime value={to as number} updateIntervalInSeconds={60} />}
                />
              ),
            }}
          />
        )}
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );
};

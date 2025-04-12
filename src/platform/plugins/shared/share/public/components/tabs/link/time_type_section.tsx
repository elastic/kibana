/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { EuiSpacer, EuiSwitch, EuiSwitchEvent, EuiText, useEuiTheme } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import dateMath from '@kbn/datemath';
import moment from 'moment';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

const formatDate = (date: moment.Moment): { date: string; time: string } => {
  const datePart = date.format('MMMM D, YYYY');
  const timePart = date.format('h:mm A');
  return { date: datePart, time: timePart };
};

const getHumanReadableDates = (
  isAbsolute: boolean,
  from?: string,
  to?: string
): { fromDate: string; fromTime: string; toDate: string; toTime: string } | undefined => {
  if (!from || !to) return;

  const fromParsed = dateMath.parse(from);
  const toParsed = dateMath.parse(to);

  if (isAbsolute) {
    const fromFormatted = fromParsed?.isValid() ? formatDate(fromParsed) : formatDate(moment(from));
    const toFormatted = toParsed?.isValid() ? formatDate(toParsed) : formatDate(moment(to));
    return {
      fromDate: fromFormatted.date,
      fromTime: fromFormatted.time,
      toDate: toFormatted.date,
      toTime: toFormatted.time,
    };
  }

  if (fromParsed?.isValid() && toParsed?.isValid()) {
    const fromFormatted = fromParsed.fromNow();
    const toFormatted = toParsed.fromNow();
    return {
      fromDate: fromFormatted,
      fromTime: '',
      toDate: toFormatted,
      toTime: '',
    };
  }
};

const BoldText = ({ text }: { text?: string }) => {
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
  const humanReadableDates = getHumanReadableDates(isAbsoluteTime, timeRange?.from, timeRange?.to);

  useEffect(() => {
    setIsAbsoluteTimeByDefault(
      !timeRange?.from?.includes('now') && !timeRange?.to?.includes('now')
    );
  }, [timeRange]);

  if (!humanReadableDates) {
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
        <FormattedMessage
          id="share.link.timeRange.infoText"
          defaultMessage="The users will see all data from {fromDate}{timeSeparator}{fromTime} to {toDate}{timeSeparator}{toTime}{relativeTimeEnding}."
          values={{
            fromDate: <BoldText text={humanReadableDates?.fromDate} />,
            timeSeparator: <BoldText text={isAbsoluteTime ? ' at ' : ''} />,
            fromTime: <BoldText text={humanReadableDates?.fromTime} />,
            toDate: <BoldText text={humanReadableDates?.toDate} />,
            toTime: <BoldText text={humanReadableDates?.toTime} />,
            relativeTimeEnding: (
              <EuiText size="s" component="span">
                {!isAbsoluteTime ? ', based on when they view it' : ''}
              </EuiText>
            ),
          }}
        />
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );
};

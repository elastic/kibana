/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiCallOut,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
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

const RelativeTimeText = ({
  value,
  unit,
  roundingUnit,
}: {
  value?: number;
  unit?: string;
  roundingUnit?: string;
}) => (
  <BoldText>
    <FormattedRelativeTime
      value={value}
      // @ts-expect-error - RelativeTimeFormatSingularUnit expected here is not exported so a cast from string is not possible
      unit={unit}
    />
    {roundingUnit && (
      <FormattedMessage
        id="share.link.timeRange.relativeTimeInfoText.roundingUnit"
        defaultMessage=" rounded to the {roundingUnit}"
        values={{
          roundingUnit,
        }}
      />
    )}
  </BoldText>
);

interface TimeRange {
  from: string;
  to: string;
}

interface Props {
  timeRange?: TimeRange;
  isAbsoluteTime: boolean;
  changeTimeType: (e: EuiSwitchEvent) => void;
}

const getRelativeTimeText = (timeRange: TimeRange) => {
  // FormattedRelativeTime doesn't support "now" as a value, it will render "0 seconds" instead
  const from = getRelativeTimeValueAndUnitFromTimeString(timeRange.from);
  const to = getRelativeTimeValueAndUnitFromTimeString(timeRange.to);

  if (!from?.value) {
    return (
      <div data-test-subj="relativeTimeInfoTextFromNow">
        <FormattedMessage
          id="share.link.timeRange.relativeTimeInfoText.fromNow"
          defaultMessage="The users will see all data from <bold>now</bold> to {to}, based on when they view it."
          values={{
            to: (
              <RelativeTimeText value={to?.value} unit={to?.unit} roundingUnit={to?.roundingUnit} />
            ),
            bold: (chunks) => <BoldText>{chunks}</BoldText>,
          }}
        />
      </div>
    );
  }

  if (!to?.value) {
    return (
      <div data-test-subj="relativeTimeInfoTextToNow">
        <FormattedMessage
          id="share.link.timeRange.relativeTimeInfoText"
          defaultMessage="The users will see all data from {from} to <bold>now</bold>, based on when they view it."
          values={{
            from: (
              <RelativeTimeText
                value={from?.value}
                unit={from?.unit}
                roundingUnit={from?.roundingUnit}
              />
            ),
            bold: (chunks) => <BoldText>{chunks}</BoldText>,
          }}
        />
      </div>
    );
  }

  return (
    <div data-test-subj="relativeTimeInfoTextDefault">
      <FormattedMessage
        id="share.link.timeRange.relativeTimeInfoText.default"
        defaultMessage="The users will see all data from {from} to {to}, based on when they view it."
        values={{
          from: (
            <RelativeTimeText
              value={from?.value}
              unit={from?.unit}
              roundingUnit={from?.roundingUnit}
            />
          ),
          to: (
            <RelativeTimeText value={to?.value} unit={to?.unit} roundingUnit={to?.roundingUnit} />
          ),
        }}
      />
    </div>
  );
};

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
      {!isAbsoluteTimeByDefault && (
        <>
          <EuiSwitch
            label={i18n.translate('share.link.timeRange.switchLabel', {
              defaultMessage: 'Use absolute time range',
            })}
            checked={isAbsoluteTime}
            onChange={changeTimeType}
          />
          <EuiSpacer size="m" />
        </>
      )}
      <EuiText size="s">
        {isAbsoluteTime ? (
          <div data-test-subj="absoluteTimeInfoText">
            <FormattedMessage
              id="share.link.timeRange.absoluteTimeInfoText"
              defaultMessage="The users will see all data from {from} to {to}."
              values={{
                from: <AbsoluteTimeText date={timeRange?.from} />,
                to: <AbsoluteTimeText date={timeRange?.to} />,
              }}
            />
          </div>
        ) : (
          getRelativeTimeText(timeRange)
        )}
      </EuiText>
      <EuiSpacer size="m" />
      {isAbsoluteTimeByDefault && (
        <EuiCallOut
          size="s"
          title={i18n.translate('share.link.timeRange.relativeTimeCallout', {
            defaultMessage: 'To use a relative time range, select it in the time picker first.',
          })}
        />
      )}
    </>
  );
};

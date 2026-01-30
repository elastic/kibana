/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiSwitchEvent } from '@elastic/eui';
import { EuiCallOut, EuiSpacer, EuiSwitch, EuiText, useEuiTheme } from '@elastic/eui';
import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { FormattedMessage, FormattedRelativeTime, FormattedDate } from '@kbn/i18n-react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  convertRelativeTimeStringToAbsoluteTimeDate,
  getRelativeTimeValueAndUnitFromTimeString,
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

const AbsoluteTimeText = ({ date, isToDate }: { date: string; isToDate?: boolean }) => {
  const absoluteDate = convertRelativeTimeStringToAbsoluteTimeDate(date, {
    roundUp: isToDate,
  });

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
  isToDate,
}: {
  value?: number;
  unit?: string;
  roundingUnit?: string;
  isToDate?: boolean;
}) => {
  // Handle "now/d" (start/end of day), "now/w" (start/end of week), etc.
  // When used as "to" date, it means "end of the period" (with roundUp)
  if (value === 0 && unit === 'second' && roundingUnit) {
    if (isToDate) {
      return (
        <FormattedMessage
          id="share.link.timeRange.endOfRoundingUnit"
          defaultMessage="<bold>the end of the {roundingUnit}</bold>"
          values={{
            roundingUnit,
            bold: (chunks) => <BoldText>{chunks}</BoldText>,
          }}
        />
      );
    }
    return (
      <FormattedMessage
        id="share.link.timeRange.startOfRoundingUnit"
        defaultMessage="<bold>the start of the {roundingUnit}</bold>"
        values={{
          roundingUnit,
          bold: (chunks) => <BoldText>{chunks}</BoldText>,
        }}
      />
    );
  }

  // Handle plain "now" case - FormattedRelativeTime can't render it properly
  if (value === 0 && unit === 'second' && !roundingUnit) {
    return (
      <FormattedMessage
        id="share.link.timeRange.now"
        defaultMessage="<bold>now</bold>"
        values={{
          bold: (chunks) => <BoldText>{chunks}</BoldText>,
        }}
      />
    );
  }

  return (
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
};

interface TimeRange {
  from: string;
  to: string;
}

interface Props {
  timeRange?: TimeRange;
  isAbsoluteTimeByDefault: boolean;
  onTimeTypeChange?: (isAbsolute: boolean) => void;
}

const getTimeRangeText = (timeRange: TimeRange) => {
  const fromIsRelative = timeRange.from.includes('now');
  const toIsRelative = timeRange.to.includes('now');
  const from = getRelativeTimeValueAndUnitFromTimeString(timeRange.from);
  const to = getRelativeTimeValueAndUnitFromTimeString(timeRange.to);

  const fromValue = fromIsRelative ? (
    <RelativeTimeText value={from?.value} unit={from?.unit} roundingUnit={from?.roundingUnit} />
  ) : (
    <AbsoluteTimeText date={timeRange.from} />
  );

  const toValue = toIsRelative ? (
    <RelativeTimeText value={to?.value} unit={to?.unit} roundingUnit={to?.roundingUnit} isToDate />
  ) : (
    <AbsoluteTimeText date={timeRange.to} isToDate />
  );

  return (
    <FormattedMessage
      id="share.link.timeRange.relativeTimeInfoText"
      defaultMessage="The users will see all data from {from} to {to}, based on when they view it."
      values={{
        from: fromValue,
        to: toValue,
      }}
    />
  );
};

export const TimeTypeSection = ({
  timeRange,
  onTimeTypeChange,
  isAbsoluteTimeByDefault,
}: Props) => {
  const [isAbsoluteTime, setIsAbsoluteTime] = useState(isAbsoluteTimeByDefault);

  const handleTimeTypeChange = (e: EuiSwitchEvent) => {
    const newIsAbsolute = e.target.checked;
    setIsAbsoluteTime(newIsAbsolute);
    onTimeTypeChange?.(newIsAbsolute);
  };

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
            onChange={handleTimeTypeChange}
            data-test-subj="timeRangeSwitch"
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
                to: <AbsoluteTimeText date={timeRange?.to} isToDate />,
              }}
            />
          </div>
        ) : (
          getTimeRangeText(timeRange)
        )}
      </EuiText>
      <EuiSpacer size="m" />
      {isAbsoluteTimeByDefault && (
        <EuiCallOut
          announceOnMount
          size="s"
          title={i18n.translate('share.link.timeRange.relativeTimeCallout', {
            defaultMessage: 'To use a relative time range, select it in the time picker first.',
          })}
          data-test-subj="relativeTimeCallout"
        />
      )}
    </>
  );
};

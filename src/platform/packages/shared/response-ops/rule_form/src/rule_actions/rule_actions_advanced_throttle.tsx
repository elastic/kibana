/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiDatePicker,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSuperSelect,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import moment, { Moment } from 'moment';
import { Frequency, WeekdayStr } from '@kbn/rrule';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { some, filter, map } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { TIMEZONE_OPTIONS } from '@kbn/core-ui-settings-common';
import { AdvancedThrottle } from '@kbn/alerting-types';

interface RuleActionsAdvancedThrottleProps {
  interval?: number;
  freq?: Frequency;
  bymonthday?: number;
  byweekday?: WeekdayStr;
  byhour?: number;
  byminute?: number;
  tzid?: string;
  onChange: (advancedThrottle: AdvancedThrottle) => void;
}

const useDefaultTimezone = () => {
  const kibanaTz: string = useUiSetting('dateFormat:tz');
  if (!kibanaTz || kibanaTz === 'Browser') return moment.tz?.guess() ?? 'UTC';
  return kibanaTz;
};
const DEFAULT_INTERVAL = 1;
const DEFAULT_FREQ = Frequency.HOURLY;
const DEFAULT_BY_MONTH_DAY = 1;
const DEFAULT_BY_WEEK_DAY = 'MO';
const DEFAULT_BY_HOUR = 0;
const DEFAULT_BY_MINUTE = 0;

export const RuleActionsAdvancedThrottle = ({
  interval = DEFAULT_INTERVAL,
  freq = DEFAULT_FREQ,
  bymonthday,
  byweekday,
  byhour,
  byminute,
  tzid,
  onChange,
}: RuleActionsAdvancedThrottleProps) => {
  const frequencyOptions: Array<{
    value: number;
    inputDisplay: string;
  }> = [
    {
      value: Frequency.MONTHLY,
      inputDisplay: 'Month',
    },
    {
      value: Frequency.WEEKLY,
      inputDisplay: 'Week',
    },
    {
      value: Frequency.DAILY,
      inputDisplay: 'Day',
    },
    {
      value: Frequency.HOURLY,
      inputDisplay: 'Hour',
    },
    {
      value: Frequency.MINUTELY,
      inputDisplay: 'Minute',
    },
    {
      value: Frequency.SECONDLY,
      inputDisplay: 'Second',
    },
  ];

  const bymonthdayOptions: Array<{
    value: number;
    inputDisplay: string;
  }> = Array(31)
    .fill(0)
    .map((_, d) => {
      const value = d + 1;
      return { value, inputDisplay: `${value}` };
    });

  const timezoneOptions: Array<{
    value: string;
    inputDisplay: string;
  }> = TIMEZONE_OPTIONS.map((tz) => ({
    value: tz,
    inputDisplay: tz,
  }));

  const byweekdayOptions: Array<{
    value: WeekdayStr;
    inputDisplay: string;
  }> = [
    {
      value: 'MO',
      inputDisplay: 'Monday',
    },
    {
      value: 'TU',
      inputDisplay: 'Tuesday',
    },
    {
      value: 'WE',
      inputDisplay: 'Wednesday',
    },
    {
      value: 'TH',
      inputDisplay: 'Thusrday',
    },
    {
      value: 'FR',
      inputDisplay: 'Friday',
    },
    {
      value: 'SA',
      inputDisplay: 'Saturday',
    },
    {
      value: 'SU',
      inputDisplay: 'Sunday',
    },
  ];

  const defaultTz = useDefaultTimezone();

  const [intervalValue, setIntervalValue] = useState(interval);
  const [freqValue, setFrequencyValue] = useState(freq);
  const [bymonthdayValue, setBymonthdayValue] = useState(bymonthday);
  const [byweekdayValue, setByweekdayValue] = useState(byweekday);
  const [byhourValue, setByhourValue] = useState(byhour);
  const [byminuteValue, setByminuteValue] = useState(byminute);
  const [tzidValue, setTzidValue] = useState(tzid);
  const [time, setTimeValue] = useState<Moment>();

  useEffect(() => {
    setIntervalValue(interval);
    setFrequencyValue(freq);
    setBymonthdayValue(bymonthday);
    setByweekdayValue(byweekday);
    setByhourValue(byhour);
    setByminuteValue(byminute);
    setTzidValue(tzid);
    setTimeValue(moment().set({ hour: byhour ?? 0, minute: byminute ?? 0, second: 0 }));
  }, [interval, freq, bymonthday, byweekday, byhour, byminute, tzid]);

  useEffect(() => {
    if (time) {
      setByhourValue(time.hour());
      setByminuteValue(time.minute());
    }
  }, [time]);

  useEffect(() => {
    if (freqValue === Frequency.MONTHLY) {
      onChange({
        freq: Frequency.MONTHLY,
        interval: intervalValue,
        bymonthday: [bymonthdayValue ?? DEFAULT_BY_MONTH_DAY],
        byhour: [byhourValue ?? DEFAULT_BY_HOUR],
        byminute: [byminuteValue ?? DEFAULT_BY_MINUTE],
        tzid: tzidValue ?? defaultTz,
      });
    } else if (freqValue === Frequency.WEEKLY) {
      onChange({
        freq: Frequency.WEEKLY,
        interval: intervalValue,
        byweekday: [byweekdayValue ?? DEFAULT_BY_WEEK_DAY],
        byhour: [byhourValue ?? DEFAULT_BY_MINUTE],
        byminute: [byminuteValue ?? DEFAULT_BY_MINUTE],
        tzid: tzidValue ?? defaultTz,
      });
    } else if (freqValue === Frequency.DAILY) {
      onChange({
        freq: Frequency.DAILY,
        interval: intervalValue,
        byhour: [byhourValue ?? DEFAULT_BY_HOUR],
        byminute: [byminuteValue ?? DEFAULT_BY_MINUTE],
        tzid: tzidValue ?? defaultTz,
      });
    } else if (freqValue === Frequency.HOURLY) {
      onChange({
        freq: Frequency.HOURLY,
        interval: intervalValue,
        byminute: [byminuteValue ?? DEFAULT_BY_MINUTE],
        tzid: tzidValue ?? defaultTz,
      });
    } else if (freqValue === Frequency.MINUTELY) {
      onChange({
        freq: Frequency.MINUTELY,
        interval: intervalValue,
        tzid: tzidValue ?? defaultTz,
      });
    } else if (freqValue === Frequency.SECONDLY) {
      onChange({
        freq: Frequency.SECONDLY,
        interval: intervalValue,
        tzid: tzidValue ?? defaultTz,
      });
    }
  }, [
    intervalValue,
    freqValue,
    bymonthdayValue,
    byweekdayValue,
    byhourValue,
    byminuteValue,
    tzidValue,
  ]);

  return (
    <>
      <EuiFormRow fullWidth>
        <EuiFlexGroup gutterSize="s">
          <EuiFlexItem grow={2}>
            <EuiFieldNumber
              prepend="Run every"
              min={1}
              value={intervalValue}
              onChange={(e) => {
                pipe(
                  some(e.target.value.trim()),
                  filter((value) => value !== ''),
                  map((value) => parseInt(value, 10)),
                  filter((value) => !isNaN(value)),
                  map((value) => {
                    setIntervalValue(value);
                  })
                );
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={2}>
            <EuiSuperSelect
              options={frequencyOptions}
              valueOfSelected={freqValue}
              onChange={(value) => setFrequencyValue(value)}
            />
          </EuiFlexItem>
          {freqValue === Frequency.MONTHLY ? (
            <EuiFlexItem grow={2}>
              <EuiSuperSelect
                prepend="Day"
                options={bymonthdayOptions}
                valueOfSelected={bymonthdayValue}
                onChange={(value) => setBymonthdayValue(value)}
              />
            </EuiFlexItem>
          ) : null}
          {freqValue === Frequency.WEEKLY ? (
            <EuiFlexItem grow={2}>
              <EuiSuperSelect
                prepend="On"
                options={byweekdayOptions}
                valueOfSelected={byweekdayValue}
                onChange={(value) => setByweekdayValue(value)}
              />
            </EuiFlexItem>
          ) : null}
          {freqValue === Frequency.HOURLY ? (
            <EuiFlexItem grow={2}>
              <EuiDatePicker
                timeIntervals={1}
                prepend="Minute"
                showTimeSelect
                showTimeSelectOnly
                selected={moment().set({ minute: byminuteValue })}
                onChange={(time: Moment) => {
                  if (time) {
                    setByminuteValue(time.minutes());
                  }
                }}
                dateFormat="mm"
                timeFormat="mm"
              />
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFormRow>
      {freqValue === Frequency.MONTHLY ||
      freqValue === Frequency.WEEKLY ||
      freqValue === Frequency.DAILY ? (
        <EuiFormRow fullWidth>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={1}>
              <EuiDatePicker
                timeIntervals={5}
                prepend="At"
                showTimeSelect
                showTimeSelectOnly
                selected={time}
                onChange={(time: Moment) => {
                  setTimeValue(time);
                }}
                dateFormat="HH:mm"
                timeFormat="HH:mm"
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiSuperSelect
                prepend="Time zone"
                options={timezoneOptions}
                valueOfSelected={tzidValue}
                onChange={(value) => setTzidValue(value)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      ) : null}
    </>
  );
};

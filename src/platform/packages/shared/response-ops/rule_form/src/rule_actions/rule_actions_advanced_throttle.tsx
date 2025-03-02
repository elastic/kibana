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
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiButtonGroup,
} from '@elastic/eui';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import moment, { Moment } from 'moment';
import { Frequency, Weekday } from '@kbn/rrule';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { some, filter, map } from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';
import { TIMEZONE_OPTIONS } from '@kbn/core-ui-settings-common';
import { AdvancedThrottle, ISO_WEEKDAYS } from '@kbn/alerting-types';
import { i18n } from '@kbn/i18n';
import { RuleFormActionsErrors } from '../types';
import { SettingsStart } from '@kbn/core/packages/ui-settings/browser';
import { I18N_WEEKDAY_OPTIONS_DDD } from '@kbn/alerts-ui-shared/src/common/constants';

interface RuleActionsAdvancedThrottleProps {
  interval?: number;
  freq?: Frequency;
  bymonthday?: number[];
  byweekday?: Weekday[];
  byhour?: number;
  byminute?: number;
  tzid?: string;
  actionErrors: RuleFormActionsErrors;
  settings: SettingsStart;
  onChange: (advancedThrottle: AdvancedThrottle) => void;
}

type SelectedMonthdays = Array<EuiComboBoxOptionOption<number>> | undefined;
type SelectedWeekdays = { [key in Weekday]: boolean } | {};

const useDefaultTimezone = () => {
  const kibanaTz: string = useUiSetting('dateFormat:tz');
  if (!kibanaTz || kibanaTz === 'Browser') return moment.tz?.guess() ?? 'UTC';
  return kibanaTz;
};

const DEFAULT_INTERVAL = 1;
const DEFAULT_FREQ = Frequency.HOURLY;
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
  actionErrors,
  settings,
  onChange,
}: RuleActionsAdvancedThrottleProps) => {
  const frequencyOptions: Array<{
    value: number;
    inputDisplay: string;
  }> = useMemo(
    () => [
      {
        value: Frequency.MONTHLY,
        inputDisplay: i18n.translate('advancedThrottle.freq.month', {
          defaultMessage: '{interval, plural, one {month} other {months}}',
          values: { interval },
        }),
      },
      {
        value: Frequency.WEEKLY,
        inputDisplay: i18n.translate('advancedThrottle.freq.week', {
          defaultMessage: '{interval, plural, one {week} other {weeks}}',
          values: { interval },
        }),
      },
      {
        value: Frequency.DAILY,
        inputDisplay: i18n.translate('advancedThrottle.freq.day', {
          defaultMessage: '{interval, plural, one {day} other {days}}',
          values: { interval },
        }),
      },
      {
        value: Frequency.HOURLY,
        inputDisplay: i18n.translate('advancedThrottle.freq.hour', {
          defaultMessage: '{interval, plural, one {hour} other {hours}}',
          values: { interval },
        }),
      },
      {
        value: Frequency.MINUTELY,
        inputDisplay: i18n.translate('advancedThrottle.freq.minute', {
          defaultMessage: '{interval, plural, one {minute} other {minutes}}',
          values: { interval },
        }),
      },
      {
        value: Frequency.SECONDLY,
        inputDisplay: i18n.translate('advancedThrottle.freq.second', {
          defaultMessage: '{interval, plural, one {second} other {seconds}}',
          values: { interval },
        }),
      },
    ],
    [interval]
  );

  const bymonthdayOptions: Array<{
    value: number;
    label: string;
  }> = Array(31)
    .fill(0)
    .map((_, d) => {
      const value = d + 1;
      return { value, label: `${value}` };
    });

  const timezoneOptions: Array<{
    value: string;
    inputDisplay: string;
  }> = TIMEZONE_OPTIONS.map((tz) => ({
    value: tz,
    inputDisplay: tz,
  }));

  const useSortedWeekdayOptions = (settings: SettingsStart) => {
    const kibanaDow: string = settings.client.get('dateFormat:dow');
    const startDow = kibanaDow ?? 'Sunday';
    const startDowIndex = I18N_WEEKDAY_OPTIONS_DDD.findIndex((o) => o.label.startsWith(startDow));
    return [
      ...I18N_WEEKDAY_OPTIONS_DDD.slice(startDowIndex),
      ...I18N_WEEKDAY_OPTIONS_DDD.slice(0, startDowIndex),
    ];
  };

  const defaultTz = useDefaultTimezone();
  const byweekdayOptions = useSortedWeekdayOptions(settings);
  const bymonthdayToOptions = (bymonthday: number[] | undefined) =>
    bymonthday ? bymonthday.map((day) => ({ label: `${day}`, value: day })) : undefined;

  const byweekdayToOptions = (byweekday: Weekday[] | undefined): SelectedWeekdays =>
    ISO_WEEKDAYS.reduce((result, day) => ({ ...result, [day]: byweekday?.includes(day) }), {});

  const optionsToByweekday = (options: SelectedWeekdays): Weekday[] => {
    const days = Object.entries(options).reduce<Weekday[]>((result, [day, isSelected]) => {
      if (isSelected) {
        return [...result, Number(day) as Weekday];
      }
      return result;
    }, []);
    if (days.length <= 0) {
      return [Weekday.MO];
    }
    return days;
  };

  const [intervalValue, setIntervalValue] = useState(interval);
  const [freqValue, setFrequencyValue] = useState(freq);
  const [selectedBymonthdayOptions, setSelectedBymonthdayOptions] = useState<SelectedMonthdays>(
    bymonthdayToOptions(bymonthday)
  );
  const [selectedByWeekdayOptions, setSelectedByWeekdayOptions] = useState<SelectedWeekdays>(
    byweekdayToOptions(byweekday)
  );
  const [byhourValue, setByhourValue] = useState(byhour);
  const [byminuteValue, setByminuteValue] = useState(byminute);
  const [tzidValue, setTzidValue] = useState(tzid);
  const [time, setTimeValue] = useState<Moment>();

  const onChangeByWeekday = useCallback(
    (id: string) => {
      if (!byweekday) return;
      const day = Number(id);
      const previouslyHasDay = byweekday.includes(day);
      const newDays = previouslyHasDay ? byweekday.filter((d) => d !== day) : [...byweekday, day];
      if (newDays.length !== 0) {
        setSelectedByWeekdayOptions(byweekdayToOptions(newDays));
      }
    },
    [byweekday]
  );

  useEffect(() => {
    setIntervalValue(interval);
    setFrequencyValue(freq);
    setByhourValue(byhour);
    setByminuteValue(byminute);
    setTzidValue(tzid);
    setTimeValue(moment().set({ hour: byhour ?? 0, minute: byminute ?? 0, second: 0 }));
    setSelectedBymonthdayOptions(bymonthdayToOptions(bymonthday));
    setSelectedByWeekdayOptions(byweekdayToOptions(byweekday));
  }, [
    interval,
    freq,
    JSON.stringify(bymonthday),
    JSON.stringify(byweekday),
    byhour,
    byminute,
    tzid,
  ]);

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
        bymonthday: (selectedBymonthdayOptions ?? [bymonthdayOptions[0]]).map((opt) => opt.value!),
        byhour: [byhourValue ?? DEFAULT_BY_HOUR],
        byminute: [byminuteValue ?? DEFAULT_BY_MINUTE],
        tzid: tzidValue ?? defaultTz,
      });
    } else if (freqValue === Frequency.WEEKLY) {
      onChange({
        freq: Frequency.WEEKLY,
        interval: intervalValue,
        byweekday: optionsToByweekday(selectedByWeekdayOptions),
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
    selectedBymonthdayOptions,
    selectedByWeekdayOptions,
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
          <EuiFlexItem grow={3}>
            <EuiSuperSelect
              options={frequencyOptions}
              valueOfSelected={freqValue}
              onChange={(value) => setFrequencyValue(value)}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFormRow>
      {freqValue === Frequency.MONTHLY ? (
        <EuiFormRow
          fullWidth
          label="Days"
          error={actionErrors.advancedThrottleBymonthday}
          isInvalid={!!actionErrors.advancedThrottleBymonthday?.length}
        >
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <EuiComboBox
                fullWidth
                options={bymonthdayOptions}
                selectedOptions={selectedBymonthdayOptions}
                onChange={(value) => setSelectedBymonthdayOptions(value)}
              ></EuiComboBox>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      ) : null}
      {freqValue === Frequency.WEEKLY ? (
        <EuiFormRow fullWidth>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <EuiButtonGroup
                isFullWidth
                legend={i18n.translate('responseOpsRuleForm.ruleForm.advancedThrottleByweekday', {
                  defaultMessage: 'Days of week',
                })}
                options={byweekdayOptions}
                idToSelectedMap={selectedByWeekdayOptions}
                type="multi"
                onChange={onChangeByWeekday}
                data-test-subj="advancedThrottleByweekday"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      ) : null}
      {freqValue === Frequency.HOURLY ? (
        <EuiFormRow fullWidth>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem>
              <EuiDatePicker
                fullWidth
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
          </EuiFlexGroup>
        </EuiFormRow>
      ) : null}
      {freqValue === Frequency.MONTHLY ||
      freqValue === Frequency.WEEKLY ||
      freqValue === Frequency.DAILY ? (
        <EuiFormRow fullWidth>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={2}>
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
            <EuiFlexItem grow={3}>
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

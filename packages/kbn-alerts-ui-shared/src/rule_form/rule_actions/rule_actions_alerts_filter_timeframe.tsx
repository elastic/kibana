/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment, { Moment } from 'moment';
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { SettingsStart } from '@kbn/core-ui-settings-browser';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
  EuiButtonGroup,
  EuiSpacer,
  EuiDatePickerRange,
  EuiDatePicker,
  EuiComboBox,
} from '@elastic/eui';
import deepEqual from 'fast-deep-equal';
import { ISO_WEEKDAYS, type IsoWeekday, type AlertsFilterTimeframe } from '@kbn/alerting-types';
import { I18N_WEEKDAY_OPTIONS_DDD } from '../../common/constants';

interface RuleActionsAlertsFilterTimeframeProps {
  state?: AlertsFilterTimeframe;
  settings: SettingsStart;
  onChange: (update?: AlertsFilterTimeframe) => void;
}

const TIMEZONE_OPTIONS = moment.tz?.names().map((n) => ({ label: n })) ?? [{ label: 'UTC' }];

const useSortedWeekdayOptions = (settings: SettingsStart) => {
  const kibanaDow: string = settings.client.get('dateFormat:dow');
  const startDow = kibanaDow ?? 'Sunday';
  const startDowIndex = I18N_WEEKDAY_OPTIONS_DDD.findIndex((o) => o.label.startsWith(startDow));
  return [
    ...I18N_WEEKDAY_OPTIONS_DDD.slice(startDowIndex),
    ...I18N_WEEKDAY_OPTIONS_DDD.slice(0, startDowIndex),
  ];
};

const useDefaultTimezone = (settings: SettingsStart) => {
  const kibanaTz: string = settings.client.get('dateFormat:tz');
  if (!kibanaTz || kibanaTz === 'Browser') return moment.tz?.guess() ?? 'UTC';
  return kibanaTz;
};

const useTimeframe = ({
  initialTimeframe,
  settings,
}: {
  initialTimeframe?: AlertsFilterTimeframe;
  settings: SettingsStart;
}) => {
  const timezone = useDefaultTimezone(settings);
  const DEFAULT_TIMEFRAME = {
    days: [],
    timezone,
    hours: {
      start: '00:00',
      end: '00:00',
    },
  };
  return useState<AlertsFilterTimeframe>(initialTimeframe || DEFAULT_TIMEFRAME);
};
const useTimeFormat = (settings: SettingsStart) => {
  const dateFormatScaled: Array<[string, string]> = settings.client.get('dateFormat:scaled') ?? [
    ['PT1M', 'HH:mm'],
  ];
  const [, PT1M] = dateFormatScaled.find(([key]) => key === 'PT1M') ?? ['', 'HH:mm'];
  return PT1M;
};

export const RuleActionsAlertsFilterTimeframe: React.FC<RuleActionsAlertsFilterTimeframeProps> = ({
  state,
  settings,
  onChange,
}) => {
  const timeFormat = useTimeFormat(settings);
  const [timeframe, setTimeframe] = useTimeframe({
    initialTimeframe: state,
    settings,
  });
  const [selectedTimezone, setSelectedTimezone] = useState([{ label: timeframe.timezone }]);

  const timeframeEnabled = useMemo(() => Boolean(state), [state]);

  const weekdayOptions = useSortedWeekdayOptions(settings);

  useEffect(() => {
    const nextState = timeframeEnabled ? timeframe : undefined;
    if (!deepEqual(state, nextState)) onChange(nextState);
  }, [timeframeEnabled, timeframe, state, onChange]);

  const toggleTimeframe = useCallback(
    () => onChange(state ? undefined : timeframe),
    [state, timeframe, onChange]
  );
  const updateTimeframe = useCallback(
    (update: Partial<AlertsFilterTimeframe>) => {
      setTimeframe({
        ...timeframe,
        ...update,
      });
    },
    [timeframe, setTimeframe]
  );

  const onChangeHours = useCallback(
    (startOrEnd: 'start' | 'end') => (date: Moment) => {
      updateTimeframe({
        hours: { ...timeframe.hours, [startOrEnd]: date.format('HH:mm') },
      });
    },
    [updateTimeframe, timeframe]
  );

  const onToggleWeekday = useCallback(
    (id: string) => {
      if (!timeframe) return;
      const day = Number(id) as IsoWeekday;
      const previouslyHasDay = timeframe.days.includes(day);
      const newDays = previouslyHasDay
        ? timeframe.days.filter((d) => d !== day)
        : [...timeframe.days, day];
      if (newDays.length !== 0) {
        updateTimeframe({ days: newDays });
      }
    },
    [timeframe, updateTimeframe]
  );
  const selectedWeekdays = useMemo(
    () =>
      ISO_WEEKDAYS.reduce(
        (result, day) => ({ ...result, [day]: timeframe.days.includes(day) }),
        {}
      ),
    [timeframe]
  );

  const onChangeTimezone = useCallback(
    (value) => {
      setSelectedTimezone(value);
      if (value[0].label) updateTimeframe({ timezone: value[0].label });
    },
    [updateTimeframe, setSelectedTimezone]
  );

  const [startH, startM] = useMemo(() => timeframe.hours.start.split(':').map(Number), [timeframe]);
  const [endH, endM] = useMemo(() => timeframe.hours.end.split(':').map(Number), [timeframe]);

  return (
    <>
      <EuiSwitch
        label={i18n.translate(
          'alertsUIShared.ruleForm.ruleActionsAlertsFilterTimeframeToggleLabel',
          {
            defaultMessage: 'If alert is generated during timeframe',
          }
        )}
        checked={timeframeEnabled}
        onChange={toggleTimeframe}
        data-test-subj="alertsFilterTimeframeToggle"
      />
      {timeframeEnabled && (
        <>
          <EuiSpacer size="s" />
          <EuiFlexItem>
            <EuiButtonGroup
              isFullWidth
              legend={i18n.translate(
                'alertsUIShared.ruleForm.ruleActionsAlertsFilterTimeframeWeekdays',
                {
                  defaultMessage: 'Days of week',
                }
              )}
              options={weekdayOptions}
              idToSelectedMap={selectedWeekdays}
              type="multi"
              onChange={onToggleWeekday}
              data-test-subj="alertsFilterTimeframeWeekdayButtons"
            />
          </EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={2}>
              <EuiDatePickerRange
                fullWidth
                startDateControl={
                  <EuiDatePicker
                    showTimeSelect
                    showTimeSelectOnly
                    dateFormat={timeFormat}
                    timeFormat={timeFormat}
                    selected={moment().set('hour', startH).set('minute', startM)}
                    onChange={onChangeHours('start')}
                    data-test-subj="alertsFilterTimeframeStart"
                  />
                }
                endDateControl={
                  <EuiDatePicker
                    showTimeSelect
                    showTimeSelectOnly
                    dateFormat={timeFormat}
                    timeFormat={timeFormat}
                    selected={moment().set('hour', endH).set('minute', endM)}
                    onChange={onChangeHours('end')}
                    data-test-subj="alertsFilterTimeframeEnd"
                  />
                }
              />
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiComboBox
                prepend={i18n.translate(
                  'alertsUIShared.ruleForm.ruleActionsAlertsFilterTimeframeTimezoneLabel',
                  { defaultMessage: 'Timezone' }
                )}
                singleSelection={{ asPlainText: true }}
                options={TIMEZONE_OPTIONS}
                selectedOptions={selectedTimezone}
                onChange={onChangeTimezone}
                isClearable={false}
                data-test-subj="alertsFilterTimeframeTimezone"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </>
  );
};

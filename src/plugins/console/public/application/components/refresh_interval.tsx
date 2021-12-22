/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component, ChangeEventHandler, KeyboardEventHandler } from 'react';
import {
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormLabel,
  EuiI18n,
  EuiScreenReaderOnly,
  EuiSelect,
  EuiSwitch,
  RelativeOption,
  TimeUnitId,
  TimeUnitLabel,
  TimeUnitLabelPlural,
  keysOf,
  htmlIdGenerator,
} from '@elastic/eui';
import { Milliseconds, ApplyRefreshInterval } from '@elastic/eui/src/components/date_picker/types';

export const timeUnits: { [id in TimeUnitId]: TimeUnitLabel } = {
  s: 'second',
  m: 'minute',
  h: 'hour',
  d: 'day',
  w: 'week',
  M: 'month',
  y: 'year',
};

export const timeUnitsPlural: { [id in TimeUnitId]: TimeUnitLabelPlural } = {
  s: 'seconds',
  m: 'minutes',
  h: 'hours',
  d: 'days',
  w: 'weeks',
  M: 'months',
  y: 'years',
};

const refreshUnitsOptions: RelativeOption[] = keysOf(timeUnits)
  .filter((timeUnit) => timeUnit === 'h' || timeUnit === 'm' || timeUnit === 's')
  .map((timeUnit) => ({ value: timeUnit, text: timeUnitsPlural[timeUnit] }));

const MILLISECONDS_IN_SECOND = 1000;
const MILLISECONDS_IN_MINUTE = MILLISECONDS_IN_SECOND * 60;
const MILLISECONDS_IN_HOUR = MILLISECONDS_IN_MINUTE * 60;

function fromMilliseconds(milliseconds: Milliseconds): EuiRefreshIntervalState {
  const round = (value: number) => parseFloat(value.toFixed(2));
  if (milliseconds > MILLISECONDS_IN_HOUR) {
    return {
      units: 'h',
      value: round(milliseconds / MILLISECONDS_IN_HOUR),
    };
  }

  if (milliseconds > MILLISECONDS_IN_MINUTE) {
    return {
      units: 'm',
      value: round(milliseconds / MILLISECONDS_IN_MINUTE),
    };
  }

  return {
    units: 's',
    value: round(milliseconds / MILLISECONDS_IN_SECOND),
  };
}

function toMilliseconds(units: TimeUnitId, value: Milliseconds) {
  switch (units) {
    case 'h':
      return Math.round(value * MILLISECONDS_IN_HOUR);
    case 'm':
      return Math.round(value * MILLISECONDS_IN_MINUTE);
    case 's':
    default:
      return Math.round(value * MILLISECONDS_IN_SECOND);
  }
}

export interface EuiRefreshIntervalProps {
  /**
   * Is refresh paused or running.
   */
  isPaused?: boolean;
  /**
   * Refresh interval in milliseconds.
   */
  refreshInterval?: Milliseconds;
  /**
   * Passes back the updated state of `isPaused` and `refreshInterval`.
   */
  onRefreshChange: ApplyRefreshInterval;
}

interface EuiRefreshIntervalState {
  value: number | '';
  units: TimeUnitId;
}

export class EuiRefreshInterval extends Component<
  EuiRefreshIntervalProps,
  EuiRefreshIntervalState
> {
  static defaultProps = {
    isPaused: true,
    refreshInterval: 1000,
  };

  state: EuiRefreshIntervalState = fromMilliseconds(this.props.refreshInterval || 0);

  generateId = htmlIdGenerator();
  legendId = this.generateId();
  refreshSelectionId = this.generateId();

  onValueChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    const sanitizedValue = parseFloat(event.target.value);
    this.setState(
      {
        value: isNaN(sanitizedValue) ? '' : sanitizedValue,
      },
      this.applyRefreshInterval
    );
  };

  onUnitsChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    this.setState(
      {
        units: event.target.value as TimeUnitId,
      },
      this.applyRefreshInterval
    );
  };

  startRefresh = () => {
    const { onRefreshChange } = this.props;
    const { value, units } = this.state;

    if (value !== '' && value > 0 && onRefreshChange !== undefined) {
      onRefreshChange({
        refreshInterval: toMilliseconds(units, value),
        isPaused: false,
      });
    }
  };

  handleKeyDown: KeyboardEventHandler<HTMLElement> = ({ key }) => {
    if (key === 'Enter') {
      this.startRefresh();
    }
  };

  applyRefreshInterval = () => {
    const { onRefreshChange, isPaused } = this.props;
    const { units, value } = this.state;
    if (value === '') {
      return;
    }
    if (!onRefreshChange) {
      return;
    }

    const refreshInterval = toMilliseconds(units, value);

    onRefreshChange({
      refreshInterval,
      isPaused: refreshInterval <= 0 ? true : !!isPaused,
    });
  };

  toggleRefresh = () => {
    const { onRefreshChange, isPaused } = this.props;
    const { units, value } = this.state;

    if (!onRefreshChange || value === '') {
      return;
    }
    onRefreshChange({
      refreshInterval: toMilliseconds(units, value),
      isPaused: !isPaused,
    });
  };

  render() {
    const { isPaused } = this.props;
    const { value, units } = this.state;

    const options = refreshUnitsOptions.find(({ value }) => value === units);
    const optionText = options ? options.text : '';

    const fullDescription = isPaused ? (
      <EuiI18n
        token="euiRefreshInterval.fullDescriptionOff"
        default="Refresh is off, interval set to {optionValue} {optionText}."
        values={{
          optionValue: value,
          optionText,
        }}
      />
    ) : (
      <EuiI18n
        token="euiRefreshInterval.fullDescriptionOn"
        default="Refresh is on, interval set to {optionValue} {optionText}."
        values={{
          optionValue: value,
          optionText,
        }}
      />
    );

    return (
      <fieldset>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiSwitch
              data-test-subj="superDatePickerToggleRefreshButton"
              aria-describedby={this.refreshSelectionId}
              checked={!isPaused}
              onChange={this.toggleRefresh}
              compressed
              label={
                <EuiFormLabel type="legend" id={this.legendId}>
                  <EuiI18n token="euiRefreshInterval.legend" default="Refresh every" />
                </EuiFormLabel>
              }
            />
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 60 }}>
            <EuiFieldNumber
              compressed
              fullWidth
              value={value}
              onChange={this.onValueChange}
              onKeyDown={this.handleKeyDown}
              isInvalid={!isPaused && (value === '' || value <= 0)}
              disabled={isPaused}
              aria-label="Refresh interval value"
              aria-describedby={`${this.refreshSelectionId} ${this.legendId}`}
              data-test-subj="superDatePickerRefreshIntervalInput"
            />
          </EuiFlexItem>
          <EuiFlexItem style={{ minWidth: 100 }} grow={2}>
            <EuiSelect
              compressed
              fullWidth
              aria-label="Refresh interval units"
              aria-describedby={`${this.refreshSelectionId} ${this.legendId}`}
              value={units}
              disabled={isPaused}
              options={refreshUnitsOptions}
              onChange={this.onUnitsChange}
              onKeyDown={this.handleKeyDown}
              data-test-subj="superDatePickerRefreshIntervalUnitsSelect"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiScreenReaderOnly>
          <p id={this.refreshSelectionId}>{fullDescription}</p>
        </EuiScreenReaderOnly>
      </fieldset>
    );
  }
}

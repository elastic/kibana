/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useCallback, useEffect, useMemo, type FormEvent } from 'react';

import { css } from '@emotion/react';
import moment from 'moment';
import {
  EuiButtonGroup,
  EuiFieldNumber,
  EuiSelect,
  EuiFieldText,
  EuiButton,
  EuiCheckbox,
  EuiFormRow,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  useGeneratedHtmlId,
} from '@elastic/eui';

import {
  PanelContainer,
  PanelHeader,
  PanelBody,
  PanelBodySection,
  PanelFooter,
  SubPanelHeading,
} from '../date_range_picker_panel_ui';
import { useDateRangePickerContext } from '../date_range_picker_context';
import { dateMathToRelativeParts } from '../format';
import { getOptionInputText } from '../utils';
import type { DateType } from '../types';
import {
  DATE_TYPE_ABSOLUTE,
  DATE_TYPE_RELATIVE,
  DATE_TYPE_NOW,
  DEFAULT_DATE_FORMAT,
  UNIT_SHORT_TO_FULL_MAP,
} from '../constants';

const UNIT_DIRECTION_OPTIONS = [
  ...Object.entries(UNIT_SHORT_TO_FULL_MAP).map(([short, full]) => ({
    value: `${short}_past`,
    text: `${full}s ago`,
  })),
  { value: '', text: '─────', disabled: true },
  ...Object.entries(UNIT_SHORT_TO_FULL_MAP).map(([short, full]) => ({
    value: `${short}_future`,
    text: `${full}s from now`,
  })),
];

interface RelativeState {
  count: number;
  unit: string;
  isFuture: boolean;
}

interface DatePartState {
  tab: DateType;
  relative: RelativeState;
  absoluteText: string;
}

const DEFAULT_RELATIVE: RelativeState = { count: 15, unit: 'm', isFuture: false };

/** Derives the initial state for one side (start or end) from the context time range. */
function deriveInitialState(
  dateString: string,
  date: Date | null,
  dateType: DateType
): DatePartState {
  if (dateType === DATE_TYPE_NOW) {
    return { tab: DATE_TYPE_NOW, relative: DEFAULT_RELATIVE, absoluteText: '' };
  }

  if (dateType === DATE_TYPE_RELATIVE) {
    const parts = dateMathToRelativeParts(dateString);
    if (parts) {
      return {
        tab: DATE_TYPE_RELATIVE,
        relative: { count: parts.count, unit: parts.unit, isFuture: parts.isFuture },
        absoluteText: date ? moment(date).format(DEFAULT_DATE_FORMAT) : '',
      };
    }
  }

  return {
    tab: DATE_TYPE_ABSOLUTE,
    relative: DEFAULT_RELATIVE,
    absoluteText: date ? moment(date).format(DEFAULT_DATE_FORMAT) : dateString,
  };
}

/** Builds a datemath string from a single date part's local state. */
function stateToDateMath(state: DatePartState): string {
  switch (state.tab) {
    case DATE_TYPE_NOW:
      return 'now';
    case DATE_TYPE_RELATIVE: {
      const { count, unit, isFuture } = state.relative;
      const operator = isFuture ? '+' : '-';
      return `now${operator}${count}${unit}`;
    }
    case DATE_TYPE_ABSOLUTE:
      return state.absoluteText;
  }
}

interface DatePartPickerProps {
  /** "Start date" or "End date" */
  label: string;
  state: DatePartState;
  onChange: (next: DatePartState) => void;
}

/** Picker for one side of the range: tab group (Relative / Absolute / Now) plus conditional controls. */
const DatePartPicker = ({ label, state, onChange }: DatePartPickerProps) => {
  const tabGroupId = useGeneratedHtmlId({ prefix: 'datePartTab' });

  const tabOptions = useMemo(
    () => [
      { id: `${tabGroupId}_${DATE_TYPE_RELATIVE}`, label: 'Relative' },
      { id: `${tabGroupId}_${DATE_TYPE_ABSOLUTE}`, label: 'Absolute' },
      { id: `${tabGroupId}_${DATE_TYPE_NOW}`, label: 'Now' },
    ],
    [tabGroupId]
  );

  const selectedTabId = `${tabGroupId}_${state.tab}`;

  const onTabChange = useCallback(
    (optionId: string) => {
      const tab = optionId.split('_').pop() as DateType;
      onChange({ ...state, tab });
    },
    [state, onChange]
  );

  const onCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const count = Math.max(0, parseInt(e.target.value, 10) || 0);
      onChange({ ...state, relative: { ...state.relative, count } });
    },
    [state, onChange]
  );

  const onUnitDirectionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const [unit, dir] = e.target.value.split('_');
      onChange({
        ...state,
        relative: { ...state.relative, unit, isFuture: dir === 'future' },
      });
    },
    [state, onChange]
  );

  const onAbsoluteTextChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...state, absoluteText: e.target.value });
    },
    [state, onChange]
  );

  return (
    <div>
      <EuiFormRow label={label}>
        <EuiButtonGroup
          legend={label}
          options={tabOptions}
          idSelected={selectedTabId}
          onChange={onTabChange}
          isFullWidth
        />
      </EuiFormRow>

      {state.tab === DATE_TYPE_RELATIVE && (
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false} style={{ width: 80 }}>
            <EuiFieldNumber
              compressed
              value={state.relative.count}
              onChange={onCountChange}
              min={0}
              aria-label="Count"
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiSelect
              compressed
              options={UNIT_DIRECTION_OPTIONS}
              value={`${state.relative.unit}_${state.relative.isFuture ? 'future' : 'past'}`}
              onChange={onUnitDirectionChange}
              aria-label="Unit and direction"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}

      {state.tab === DATE_TYPE_ABSOLUTE && (
        <EuiFieldText
          compressed
          value={state.absoluteText}
          onChange={onAbsoluteTextChange}
          aria-label={`${label} absolute date`}
        />
      )}

      {state.tab === DATE_TYPE_NOW && (
        <EuiText size="xs" color="subdued">
          <p>
            {label === 'Start date' ? 'Start' : 'End'} time will be set to the time of the refresh.
          </p>
        </EuiText>
      )}
    </div>
  );
};

interface ShorthandDisplayProps {
  value: string;
}

/** Read-only shorthand display with help text. */
const ShorthandDisplay = ({ value }: ShorthandDisplayProps) => (
  <EuiFormRow
    label="Shorthand"
    helpText={
      <>
        You can type this directly in the time picker to get the same time range
        <br />
        <EuiLink href="#" target="_blank" external>
          Shorthand syntax
        </EuiLink>
      </>
    }
  >
    <EuiFieldText compressed value={value} readOnly aria-label="Shorthand" />
  </EuiFormRow>
);

/** Panel for specifying a custom absolute or relative time range. */
export function CustomTimeRangePanel() {
  const { timeRange, setText, applyRange, onPresetSave } = useDateRangePickerContext();
  const formId = useGeneratedHtmlId({ prefix: 'customTimeRangeForm' });
  const saveCheckboxId = useGeneratedHtmlId({ prefix: 'saveAsPreset' });
  const [saveAsPreset, setSaveAsPreset] = useState(false);

  const [startState, setStartState] = useState<DatePartState>(() =>
    deriveInitialState(timeRange.start, timeRange.startDate, timeRange.type[0])
  );
  const [endState, setEndState] = useState<DatePartState>(() =>
    deriveInitialState(timeRange.end, timeRange.endDate, timeRange.type[1])
  );

  const startDateMath = useMemo(() => stateToDateMath(startState), [startState]);
  const endDateMath = useMemo(() => stateToDateMath(endState), [endState]);
  const shorthandText = useMemo(
    () => getOptionInputText({ start: startDateMath, end: endDateMath }),
    [startDateMath, endDateMath]
  );

  useEffect(() => {
    setText(shorthandText);
  }, [shorthandText, setText]);

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      applyRange();
    },
    [applyRange]
  );

  const formStyles = css`
    padding-block: 8px;
  `;

  return (
    <PanelContainer>
      <PanelHeader>
        <SubPanelHeading>Custom time range</SubPanelHeading>
      </PanelHeader>
      <PanelBody>
        <PanelBodySection>
          <form id={formId} onSubmit={onSubmit} css={formStyles}>
            <DatePartPicker label="Start date" state={startState} onChange={setStartState} />
            <DatePartPicker label="End date" state={endState} onChange={setEndState} />
            <ShorthandDisplay value={shorthandText} />
          </form>
        </PanelBodySection>
      </PanelBody>
      <PanelFooter
        primaryAction={
          <EuiButton size="s" fill type="submit" form={formId}>
            Apply
          </EuiButton>
        }
      >
        {onPresetSave && (
          <EuiCheckbox
            id={saveCheckboxId}
            label="Save as preset"
            checked={saveAsPreset}
            onChange={(e) => setSaveAsPreset(e.target.checked)}
          />
        )}
      </PanelFooter>
    </PanelContainer>
  );
}
CustomTimeRangePanel.PANEL_ID = 'custom-time-range-panel';

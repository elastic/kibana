/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type FormEvent,
  type MouseEvent,
} from 'react';

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
  EuiFormFieldset,
  EuiButtonEmpty,
  EuiFormAppend,
  useGeneratedHtmlId,
  copyToClipboard,
  EuiToolTip,
  EuiCallOut,
  useEuiFontSize,
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
import { getOptionShorthand } from '../utils';
import type { DateType, DateOffset, TimeUnit } from '../types';
import {
  DATE_TYPE_ABSOLUTE,
  DATE_TYPE_RELATIVE,
  DATE_TYPE_NOW,
  DEFAULT_DATE_FORMAT,
  UNIT_SHORT_TO_FULL_MAP,
  DATE_RANGE_INPUT_DELIMITER,
} from '../constants';
import { useDateRangePickerPanelNavigation } from '../date_range_picker_panel_navigation';
import { customTimeRangePanelTexts } from '../translations';

/** Options for relative time unit/direction selection */
const UNIT_DIRECTION_OPTIONS = [
  ...Object.entries(UNIT_SHORT_TO_FULL_MAP).map(([short, full]) => ({
    value: `${short}_past`,
    text: customTimeRangePanelTexts.unitPastSuffix(full),
  })),
  // EuiSelect does not support grouping, this is temporary workaround
  { value: '', text: '---', disabled: true },
  ...Object.entries(UNIT_SHORT_TO_FULL_MAP).map(([short, full]) => ({
    value: `${short}_future`,
    text: customTimeRangePanelTexts.unitFutureSuffix(full),
  })),
];

/** Default date offset value to show on the relative selection part */
const DEFAULT_RELATIVE: DateOffset = { count: -15, unit: 'm' };

interface DatePartState {
  type: DateType;
  relativeOffset: DateOffset;
  absoluteText: string;
}

interface DatePartPickerProps {
  label: string;
  side: 'start' | 'end';
  state: DatePartState;
  onChange: (next: DatePartState) => void;
  error?: string;
}

/** Picker for one side of the range: tab group (Relative / Absolute / Now) plus conditional controls. */
const DatePartPicker = ({ label, side, state, onChange, error }: DatePartPickerProps) => {
  const tabGroupId = useGeneratedHtmlId({ prefix: 'datePartTab' });
  const fonts = useEuiFontSize('xs');

  const tabOptions = useMemo(
    () => [
      { id: `${tabGroupId}_${DATE_TYPE_RELATIVE}`, label: customTimeRangePanelTexts.relativeTab },
      { id: `${tabGroupId}_${DATE_TYPE_ABSOLUTE}`, label: customTimeRangePanelTexts.absoluteTab },
      { id: `${tabGroupId}_${DATE_TYPE_NOW}`, label: customTimeRangePanelTexts.nowTab },
    ],
    [tabGroupId]
  );

  const selectedTabId = `${tabGroupId}_${state.type}`;

  const onTabChange = useCallback(
    (optionId: string) => {
      const type = optionId.split('_').pop() as DateType;
      onChange({ ...state, type });
    },
    [state, onChange]
  );

  const onCountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = Math.max(0, parseInt(e.target.value, 10) || 0);
      const isFuture = state.relativeOffset.count >= 0;
      const count = isFuture ? raw : -raw;
      onChange({ ...state, relativeOffset: { ...state.relativeOffset, count } });
    },
    [state, onChange]
  );

  const onUnitDirectionChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const [unit, dir] = e.target.value.split('_');
      const isFuture = dir === 'future';
      const absCount = Math.abs(state.relativeOffset.count);
      onChange({
        ...state,
        relativeOffset: {
          ...state.relativeOffset,
          unit: unit as TimeUnit,
          count: isFuture ? absCount : -absCount,
        },
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

  const isStart = side === 'start';

  return (
    <div>
      <EuiFormFieldset legend={{ children: label }}>
        <EuiFlexGroup gutterSize="s" direction="column" responsive={false}>
          <EuiButtonGroup
            legend={label}
            options={tabOptions}
            idSelected={selectedTabId}
            onChange={onTabChange}
            buttonSize="compressed"
            isFullWidth
          />

          {state.type === DATE_TYPE_RELATIVE && (
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false} style={{ width: 80 }}>
                <EuiFieldNumber
                  compressed
                  value={Math.abs(state.relativeOffset.count)}
                  onChange={onCountChange}
                  min={0}
                  aria-label={customTimeRangePanelTexts.countAriaLabel}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiSelect
                  compressed
                  options={UNIT_DIRECTION_OPTIONS}
                  value={`${state.relativeOffset.unit}_${
                    state.relativeOffset.count >= 0 ? 'future' : 'past'
                  }`}
                  onChange={onUnitDirectionChange}
                  aria-label={customTimeRangePanelTexts.unitDirectionAriaLabel}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          )}

          {state.type === DATE_TYPE_ABSOLUTE && (
            <EuiFieldText
              compressed
              value={state.absoluteText}
              onChange={onAbsoluteTextChange}
              aria-label={customTimeRangePanelTexts.absoluteDateAriaLabel(label)}
            />
          )}

          {state.type === DATE_TYPE_NOW && (
            <EuiText size="xs" color="subdued">
              <p>
                {isStart
                  ? customTimeRangePanelTexts.nowStartHelpText
                  : customTimeRangePanelTexts.nowEndHelpText}
              </p>
            </EuiText>
          )}

          {error && (
            <EuiCallOut
              announceOnMount
              title={error}
              color="danger"
              iconType="warning"
              size="s"
              css={css`
                /* there's no size=xs for EuiCallOut :( */
                .euiCallOutHeader__title {
                  font-size: ${fonts.fontSize};
                  line-height: ${fonts.lineHeight};
                }
              `}
            />
          )}
        </EuiFlexGroup>
      </EuiFormFieldset>
    </div>
  );
};

interface ShorthandDisplayProps {
  value: string;
  /** When true, show "(not available)" and disable the copy button. */
  isDisabled?: boolean;
}

/** Read-only shorthand display with help text. */
const ShorthandDisplay = ({ value, isDisabled }: ShorthandDisplayProps) => {
  const { navigateTo } = useDateRangePickerPanelNavigation();
  const [isCopied, setIsCopied] = useState(false);

  const documentationPanelId = 'documentation-panel';

  const displayValue = isDisabled ? customTimeRangePanelTexts.notAvailable : value;

  const copy = (event: MouseEvent) => {
    event.preventDefault();
    copyToClipboard(displayValue);
    setIsCopied(true);
  };

  return (
    <EuiFormRow
      label={customTimeRangePanelTexts.shorthandLabel}
      helpText={
        <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="xs" responsive={false}>
          <p>{customTimeRangePanelTexts.shorthandHelpText}</p>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="xs"
              iconSide="right"
              iconType="documentation"
              flush="both"
              onClick={() => navigateTo(documentationPanelId)}
            >
              {customTimeRangePanelTexts.shorthandSyntaxLink}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    >
      <EuiFieldText
        append={
          <EuiToolTip
            content={
              isCopied
                ? customTimeRangePanelTexts.shorthandCopied
                : customTimeRangePanelTexts.copyShorthandTooltip
            }
          >
            <EuiFormAppend
              iconLeft="copy"
              element="button"
              onClick={copy}
              onBlur={() => setIsCopied(false)}
              disabled={isDisabled}
            />
          </EuiToolTip>
        }
        compressed
        value={displayValue}
        readOnly
        aria-label={customTimeRangePanelTexts.shorthandLabel}
      />
    </EuiFormRow>
  );
};

/**
 * Panel for specifying a custom absolute or relative time range.
 */
export function CustomTimeRangePanel() {
  const { timeRange, text, setText, applyRange, onPresetSave } = useDateRangePickerContext();
  const formId = useGeneratedHtmlId({ prefix: 'customTimeRangeForm' });
  const saveCheckboxId = useGeneratedHtmlId({ prefix: 'saveAsPreset' });
  const [saveAsPreset, setSaveAsPreset] = useState(false);

  const originalTextRef = useRef(text);
  const hasAppliedRef = useRef(false);

  const [startState, setStartState] = useState<DatePartState>(() =>
    deriveInitialState(timeRange.start, timeRange.startDate, timeRange.type[0])
  );
  const [endState, setEndState] = useState<DatePartState>(() =>
    deriveInitialState(timeRange.end, timeRange.endDate, timeRange.type[1])
  );

  const startDateString = useMemo(() => datePartStateToDateString(startState), [startState]);
  const endDateString = useMemo(() => datePartStateToDateString(endState), [endState]);

  const inputText = useMemo(
    () =>
      `${datePartStateToInputFragment(
        startState
      )} ${DATE_RANGE_INPUT_DELIMITER} ${datePartStateToInputFragment(endState)}`,
    [startState, endState]
  );
  const shorthandValue = useMemo(
    () => getOptionShorthand({ start: startDateString, end: endDateString }),
    [startDateString, endDateString]
  );

  const isInternalChangeRef = useRef(false);
  const isPanelDrivenChangeRef = useRef(false);

  const handleStartStateChange = useCallback((next: DatePartState) => {
    isPanelDrivenChangeRef.current = true;
    setStartState(next);
  }, []);

  const handleEndStateChange = useCallback((next: DatePartState) => {
    isPanelDrivenChangeRef.current = true;
    setEndState(next);
  }, []);

  useEffect(() => {
    if (isInternalChangeRef.current) {
      isInternalChangeRef.current = false;
      return;
    }
    // Both bounds must be present; skip when input is partial or unparseable.
    if (!timeRange.start || !timeRange.end) return;
    setStartState(deriveInitialState(timeRange.start, timeRange.startDate, timeRange.type[0]));
    setEndState(deriveInitialState(timeRange.end, timeRange.endDate, timeRange.type[1]));
  }, [timeRange.start, timeRange.end, timeRange.startDate, timeRange.endDate, timeRange.type]);

  useEffect(() => {
    if (!isPanelDrivenChangeRef.current) return;
    isPanelDrivenChangeRef.current = false;
    isInternalChangeRef.current = true;
    setText(inputText);
  }, [inputText, setText]);

  const endBeforeStart =
    timeRange.startDate != null &&
    timeRange.endDate != null &&
    timeRange.endDate.getTime() <= timeRange.startDate.getTime();
  const endError = endBeforeStart ? customTimeRangePanelTexts.endBeforeStartError : undefined;

  const handleGoBack = useCallback(() => {
    if (!hasAppliedRef.current) {
      setText(originalTextRef.current);
    }
  }, [setText]);

  const onSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      hasAppliedRef.current = true;
      if (saveAsPreset && onPresetSave) {
        onPresetSave({ start: startDateString, end: endDateString, label: inputText });
      }
      applyRange();
    },
    [applyRange, saveAsPreset, onPresetSave, startDateString, endDateString, inputText]
  );

  return (
    <PanelContainer>
      <PanelHeader>
        <SubPanelHeading onGoBack={handleGoBack}>
          {customTimeRangePanelTexts.heading}
        </SubPanelHeading>
      </PanelHeader>
      <PanelBody spacingSide="both">
        <PanelBodySection>
          <form id={formId} onSubmit={onSubmit}>
            <EuiFlexGroup gutterSize="l" direction="column" responsive={false}>
              <DatePartPicker
                label={customTimeRangePanelTexts.startDateLabel}
                side="start"
                state={startState}
                onChange={handleStartStateChange}
              />
              <DatePartPicker
                label={customTimeRangePanelTexts.endDateLabel}
                side="end"
                state={endState}
                onChange={handleEndStateChange}
                error={endError}
              />
              <ShorthandDisplay
                value={shorthandValue ?? ''}
                isDisabled={shorthandValue == null || timeRange.isInvalid}
              />
            </EuiFlexGroup>
          </form>
        </PanelBodySection>
      </PanelBody>
      <PanelFooter
        primaryAction={
          <EuiButton size="s" fill type="submit" form={formId} disabled={timeRange.isInvalid}>
            {customTimeRangePanelTexts.applyButton}
          </EuiButton>
        }
      >
        {onPresetSave && (
          <EuiCheckbox
            id={saveCheckboxId}
            label={customTimeRangePanelTexts.saveAsPresetCheckbox}
            checked={saveAsPreset}
            onChange={(e) => setSaveAsPreset(e.target.checked)}
          />
        )}
      </PanelFooter>
    </PanelContainer>
  );
}
CustomTimeRangePanel.PANEL_ID = 'custom-time-range-panel';

/** Derives the initial state for one side (start or end) from the context time range. */
function deriveInitialState(
  dateString: string,
  date: Date | null,
  dateType: DateType
): DatePartState {
  // TODO: temporary default format, will be refactored
  const formatAbsolute = (d: Date | null) => moment(d ?? undefined).format(DEFAULT_DATE_FORMAT);

  if (dateType === DATE_TYPE_NOW) {
    return {
      type: DATE_TYPE_NOW,
      relativeOffset: DEFAULT_RELATIVE,
      absoluteText: formatAbsolute(null),
    };
  }

  if (dateType === DATE_TYPE_RELATIVE) {
    const parts = dateMathToRelativeParts(dateString);
    if (parts) {
      return {
        type: DATE_TYPE_RELATIVE,
        relativeOffset: {
          count: parts.isFuture ? parts.count : -parts.count,
          unit: parts.unit as TimeUnit,
          roundTo: parts.round as TimeUnit | undefined,
        },
        absoluteText: formatAbsolute(date),
      };
    }
  }

  return {
    type: DATE_TYPE_ABSOLUTE,
    relativeOffset: DEFAULT_RELATIVE,
    absoluteText: date
      ? moment(date).format(DEFAULT_DATE_FORMAT)
      : dateString || formatAbsolute(null),
  };
}

/**
 * Converts a DatePartState to the text fragment shown in the main input field.
 * RELATIVE dates strip the leading `now` (e.g. `now-15m` → `-15m`);
 * NOW type emits the literal string `"now"`;
 * ABSOLUTE type returns the user's typed text as-is.
 */
function datePartStateToInputFragment(state: DatePartState): string {
  if (state.type === DATE_TYPE_NOW) return 'now';
  if (state.type === DATE_TYPE_RELATIVE) {
    return datePartStateToDateString(state).replace(/^now/, '');
  }
  return state.absoluteText;
}

function datePartStateToDateString(state: DatePartState): string {
  switch (state.type) {
    case DATE_TYPE_NOW:
      return 'now';
    case DATE_TYPE_RELATIVE: {
      const { count, unit, roundTo } = state.relativeOffset;
      const operator = count >= 0 ? '+' : '-';
      const round = roundTo ? `/${roundTo}` : '';
      return `now${operator}${Math.abs(count)}${unit}${round}`;
    }
    case DATE_TYPE_ABSOLUTE:
      return state.absoluteText;
  }
}

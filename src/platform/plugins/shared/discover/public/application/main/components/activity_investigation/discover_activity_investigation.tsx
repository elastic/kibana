/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useId, useState, type ReactElement } from 'react';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTextColor,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ToolbarSelector, type SelectableEntry } from '@kbn/shared-ux-toolbar-selector';
import type { ActivityInvestigationResult } from './fetch_activity_investigation';
import { useActivityInvestigation } from './use_activity_investigation';
import { useActivityInvestigationChat } from './use_activity_investigation_chat';
import {
  getActivityInvestigationLabel,
  getActivityInvestigationSubject,
} from './activity_investigation_chat';
import { ActivityInvestigationQuestion } from './activity_investigation_question';

const INTERVAL_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'shortOffset',
};

const MAX_SELECTOR_LABEL_LENGTH = 80;
const MAX_OPTION_LABEL_LENGTH = 120;

const truncateMiddle = (value: string, maxLength: number): string => {
  if (value.length <= maxLength) return value;

  const availableLength = maxLength - 1;
  const startLength = Math.ceil(availableLength / 2);
  const endLength = Math.floor(availableLength / 2);
  return `${value.slice(0, startLength)}…${value.slice(-endLength)}`;
};

const messages = {
  analysisFailed: (): string =>
    i18n.translate('discover.activityInvestigation.analysisFailedErrorMessage', {
      defaultMessage: 'Activity analysis failed. Refresh the query to try again.',
    }),
  analysisFailedWithDetails: (details: string): string =>
    i18n.translate('discover.activityInvestigation.analysisFailedWithDetailsErrorMessage', {
      defaultMessage: 'Activity analysis failed: {details}',
      values: { details },
    }),
  historyUnavailable: (): string =>
    i18n.translate('discover.activityInvestigation.historyUnavailableDescription', {
      defaultMessage: 'Activity analysis needs more historical data for the selected period.',
    }),
  historyAvailableFrom: (date: string): string =>
    i18n.translate('discover.activityInvestigation.historyAvailableFromDescription', {
      defaultMessage:
        'The earliest source event is {date}. No increase with an available earlier daily comparison was found.',
      values: { date },
    }),
  clockChange: (): string =>
    i18n.translate('discover.activityInvestigation.clockChangeDescription', {
      defaultMessage: 'Activity analysis cannot compare these periods across a clock change.',
    }),
  missingTimeField: (): string =>
    i18n.translate('discover.activityInvestigation.missingTimeFieldDescription', {
      defaultMessage: 'Activity analysis requires the time field in the query output.',
    }),
  historyNotComparable: (): string =>
    i18n.translate('discover.activityInvestigation.historyNotComparableDescription', {
      defaultMessage: 'Activity analysis could not compare the selected period with its history.',
    }),
  analysisTimedOut: (): string =>
    i18n.translate('discover.activityInvestigation.analysisTimedOutErrorMessage', {
      defaultMessage: 'Activity analysis timed out. Refresh the query to try again.',
    }),
  increasesFound: (count: number): string =>
    i18n.translate('discover.activityInvestigation.investigationOptionsTitle', {
      defaultMessage:
        '{count, plural, one {# investigation option} other {# investigation options}}',
      values: { count },
    }),
  actorOption: (activity: string, interval: string): string =>
    i18n.translate('discover.activityInvestigation.actorWithIntervalDropDownOptionLabel', {
      defaultMessage: '{activity} · {interval}',
      values: { activity, interval },
    }),
  investigate: (): string =>
    i18n.translate('discover.activityInvestigation.investigateButtonLabel', {
      defaultMessage: 'Investigate',
    }),
  closeChat: (): string =>
    i18n.translate('discover.activityInvestigation.closeChatButtonLabel', {
      defaultMessage: 'Close chat to start a new investigation',
    }),
  chatUnavailable: (): string =>
    i18n.translate('discover.activityInvestigation.chatUnavailableDescription', {
      defaultMessage: 'Agent Builder is not available or you do not have permission to use it.',
    }),
  intervalInTimeZone: (interval: string, timeZone: string): string =>
    i18n.translate('discover.activityInvestigation.intervalInTimeZoneDescription', {
      defaultMessage: '{interval} ({timeZone})',
      values: { interval, timeZone },
    }),
  intervalRange: (start: string, end: string): string =>
    i18n.translate('discover.activityInvestigation.intervalRangeDescription', {
      defaultMessage: '{start} – {end}',
      values: { start, end },
    }),
  detectedInterval: (interval: string, timeZone: string): string =>
    i18n.translate('discover.activityInvestigation.detectedIntervalDescription', {
      defaultMessage: 'Detected interval: {interval} · {timeZone}',
      values: { interval, timeZone },
    }),
} as const;

const formatActivityInterval = (start: number, end: number, timeZone: string): string => {
  const locale = i18n.getLocale();
  const formatter = new Intl.DateTimeFormat(locale, { ...INTERVAL_DATE_FORMAT, timeZone });
  const getOffset = (value: number) =>
    formatter.formatToParts(value).find(({ type }) => type === 'timeZoneName')?.value;
  const startOffset = getOffset(start);
  const endOffset = getOffset(end);

  // Keep both offsets when the interval crosses a clock change.
  if (!startOffset || startOffset !== endOffset) {
    return messages.intervalRange(formatter.format(start), formatter.format(end));
  }

  const interval = new Intl.DateTimeFormat(locale, {
    ...INTERVAL_DATE_FORMAT,
    timeZone,
    timeZoneName: undefined,
  }).formatRange(start, end);

  return messages.intervalInTimeZone(interval, startOffset);
};

const ActivityInvestigation = (): ReactElement | null => {
  const { euiTheme } = useEuiTheme();
  const intervalId = useId();
  const { analysis, error: analysisError, errorDetails } = useActivityInvestigation();
  const results = analysis?.results;
  const { canOpenChat, chatOpen, isOpening, error, clearError, investigate } =
    useActivityInvestigationChat(results);
  const [selection, setSelection] = useState<{
    results: readonly ActivityInvestigationResult[];
    id: string;
  }>();

  if (!results?.length) {
    const message =
      analysisError === 'timeout'
        ? messages.analysisTimedOut()
        : analysisError === 'failed'
        ? errorDetails
          ? messages.analysisFailedWithDetails(errorDetails)
          : messages.analysisFailed()
        : analysis?.unassessableReason === 'insufficient-history'
        ? analysis.historyStartTimeMs !== undefined
          ? messages.historyAvailableFrom(
              new Intl.DateTimeFormat(i18n.getLocale(), {
                ...INTERVAL_DATE_FORMAT,
                timeZone: 'UTC',
              }).format(analysis.historyStartTimeMs)
            )
          : messages.historyUnavailable()
        : analysis?.unassessableReason === 'clock-change'
        ? messages.clockChange()
        : analysis?.unassessableReason === 'missing-time-field'
        ? messages.missingTimeField()
        : analysis?.unassessableReason
        ? messages.historyNotComparable()
        : undefined;
    return message ? (
      <EuiText
        size="s"
        color="subdued"
        css={css({ paddingInline: euiTheme.size.m, paddingBlock: euiTheme.size.s })}
        data-test-subj={
          analysisError
            ? 'discoverActivityInvestigationError'
            : 'discoverActivityInvestigationIncomplete'
        }
      >
        <p role="status">{message}</p>
      </EuiText>
    ) : null;
  }

  // One detected total, followed by descriptive field measurements in the same windows.
  const orderedResults = results;
  // Tie selection to the frozen response, so refreshing cannot reuse an old actor or interval.
  const selectedId = selection?.results === results ? selection.id : orderedResults[0].id;
  const selectedResult = orderedResults.find(({ id }) => id === selectedId) ?? orderedResults[0];
  const hasMultipleResults = results.length > 1;
  const getTimeZone = ({ request }: ActivityInvestigationResult): string =>
    request.timeZone ?? 'UTC';
  const getInterval = (result: ActivityInvestigationResult): string => {
    const { increase } = result;
    return formatActivityInterval(increase.startTimeMs, increase.endTimeMs, getTimeZone(result));
  };
  const getIntervalDescription = (result: ActivityInvestigationResult): string =>
    messages.detectedInterval(getInterval(result), getTimeZone(result));
  const options: SelectableEntry[] = orderedResults.map((result) => {
    const label = getActivityInvestigationSubject(result);
    return {
      value: result.id,
      label: truncateMiddle(label, MAX_OPTION_LABEL_LENGTH),
      searchableLabel: label,
      toolTipContent: messages.actorOption(
        getActivityInvestigationLabel(result),
        getInterval(result)
      ),
      checked: result.id === selectedResult.id ? 'on' : undefined,
    };
  });
  const selectedLabel =
    selectedResult.metricField ?? getActivityInvestigationSubject(selectedResult);
  const selectedTooltip = messages.actorOption(
    getActivityInvestigationLabel(selectedResult),
    getInterval(selectedResult)
  );
  const subject = hasMultipleResults ? (
    <div css={css({ display: 'inline-flex', verticalAlign: 'middle', maxWidth: '100%' })}>
      <ToolbarSelector
        data-test-subj="discoverActivityInvestigationActors"
        data-selected-value={selectedResult.id}
        buttonLabel={truncateMiddle(selectedLabel, MAX_SELECTOR_LABEL_LENGTH)}
        buttonTooltipContent={selectedTooltip}
        popoverTitle={messages.increasesFound(results.length)}
        singleSelection
        searchable
        optionMatcher={({ option, searchValue }) =>
          (option.searchableLabel ?? option.label).toLowerCase().includes(searchValue.toLowerCase())
        }
        options={options}
        disabled={isOpening || chatOpen}
        onChange={(actor) => {
          if (!actor) return;
          setSelection({ results, id: actor.value });
          clearError();
        }}
      />
    </div>
  ) : (
    selectedLabel
  );

  return (
    <EuiPanel
      color="primary"
      paddingSize="m"
      hasShadow={false}
      grow={false}
      data-test-subj="discoverActivityInvestigationSuggestion"
    >
      <EuiText size="s">
        <div id={intervalId} aria-live="polite">
          <div
            data-test-subj="discoverActivityInvestigationQuestion"
            css={css({ overflowWrap: 'anywhere', fontWeight: euiTheme.font.weight.semiBold })}
          >
            <ActivityInvestigationQuestion result={selectedResult} subject={subject} />
          </div>
          <p>
            <EuiTextColor color="subdued">{getIntervalDescription(selectedResult)}</EuiTextColor>
          </p>
        </div>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType={chatOpen ? 'cross' : 'question'}
            disabled={isOpening || (!chatOpen && !canOpenChat)}
            isLoading={isOpening}
            onClick={() => investigate(selectedResult)}
            aria-describedby={intervalId}
            css={css({ height: 'auto', minHeight: euiTheme.size.xl, maxWidth: '100%' })}
            contentProps={{ css: css({ paddingBlock: euiTheme.size.xs }) }}
            textProps={{ css: css({ whiteSpace: 'normal', textAlign: 'left' }) }}
            data-test-subj="discoverActivityInvestigationButton"
          >
            {chatOpen ? messages.closeChat() : messages.investigate()}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      {(!canOpenChat || error) && (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            {!canOpenChat && <p>{messages.chatUnavailable()}</p>}
            {error && (
              <p role="alert" css={css({ color: euiTheme.colors.textDanger })}>
                {error}
              </p>
            )}
          </EuiText>
        </>
      )}
    </EuiPanel>
  );
};

export const DiscoverActivityInvestigation = (): ReactElement => <ActivityInvestigation />;

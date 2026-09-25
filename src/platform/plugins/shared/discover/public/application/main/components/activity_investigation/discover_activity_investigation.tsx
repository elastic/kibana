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
import { compareActivityIncreases } from '../../../../../common/activity_investigation/activity_increase';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import type { ActivityInvestigationResult } from './fetch_activity_investigation';
import {
  ACTIVITY_INVESTIGATION_FEATURE_FLAG,
  useActivityInvestigation,
} from './use_activity_investigation';
import { useActivityInvestigationChat } from './use_activity_investigation_chat';
import {
  getActivityInvestigationLabel,
  getActivityInvestigationQuestion,
} from './activity_investigation_chat';

const INTERVAL_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'shortOffset',
};

const messages = {
  analysisFailed: (): string =>
    i18n.translate('discover.activityInvestigation.analysisFailedErrorMessage', {
      defaultMessage: 'Activity analysis failed. Refresh the query to try again.',
    }),
  analysisTimedOut: (): string =>
    i18n.translate('discover.activityInvestigation.analysisTimedOutErrorMessage', {
      defaultMessage: 'Activity analysis timed out. Refresh the query to try again.',
    }),
  incompleteGroups: (): string =>
    i18n.translate('discover.activityInvestigation.incompleteGroupsDescription', {
      defaultMessage:
        'Some categorical fields could not be fully analyzed. Increases in those fields may be missing.',
    }),
  increasesFound: (count: number): string =>
    i18n.translate('discover.activityInvestigation.increasesFoundButtonLabel', {
      defaultMessage:
        '{count, plural, one {# activity increase found} other {# activity increases found}}',
      values: { count },
    }),
  selectActors: (): string =>
    i18n.translate('discover.activityInvestigation.selectActorsTitle', {
      defaultMessage: 'Activity increases',
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
  const { analysis, error: analysisError } = useActivityInvestigation();
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
        ? messages.analysisFailed()
        : analysis?.groupAnalysisIncomplete
        ? messages.incompleteGroups()
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

  const orderedResults = [...results].sort((left, right) =>
    compareActivityIncreases(left.increase, right.increase)
  );
  // Tie selection to the frozen response, so refreshing cannot reuse an old actor or interval.
  const selectedId = selection?.results === results ? selection.id : orderedResults[0].id;
  const selectedResult =
    orderedResults.find(({ id }) => id === selectedId) ?? orderedResults[0];
  const hasMultipleResults = results.length > 1;
  const getInterval = ({ increase, request }: ActivityInvestigationResult): string =>
    formatActivityInterval(increase.startTimeMs, increase.endTimeMs, request.timeZone ?? 'UTC');
  const options: SelectableEntry[] = orderedResults.map((result) => ({
    value: result.id,
    label: messages.actorOption(getActivityInvestigationLabel(result), getInterval(result)),
    checked: result.id === selectedResult.id ? 'on' : undefined,
  }));

  const buttonLabel = hasMultipleResults
    ? messages.investigate()
    : getActivityInvestigationQuestion(selectedResult.increase, selectedResult.actor);

  return (
    <EuiPanel
      color="primary"
      paddingSize="m"
      hasShadow={false}
      grow={false}
      data-test-subj="discoverActivityInvestigationSuggestion"
    >
      <EuiFlexGroup alignItems="center" gutterSize="m" wrap responsive={false}>
        {hasMultipleResults && (
          <EuiFlexItem grow={false}>
            <ToolbarSelector
              data-test-subj="discoverActivityInvestigationActors"
              data-selected-value={selectedResult.id}
              buttonLabel={messages.increasesFound(results.length)}
              popoverTitle={messages.selectActors()}
              singleSelection
              searchable
              optionMatcher={({ option, searchValue }) =>
                option.label.toLowerCase().includes(searchValue.toLowerCase())
              }
              options={options}
              disabled={isOpening || chatOpen}
              onChange={(actor) => {
                if (!actor) return;
                setSelection({ results, id: actor.value });
                clearError();
              }}
            />
          </EuiFlexItem>
        )}
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
            {chatOpen ? messages.closeChat() : buttonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size={hasMultipleResults ? 'm' : 's'} />
      <EuiText size="s" color="subdued">
        <div id={intervalId} aria-live="polite">
          <p css={css({ overflowWrap: 'anywhere' })}>
            {hasMultipleResults && (
              <EuiTextColor
                color="default"
                css={css({ display: 'block', marginBottom: euiTheme.size.xs })}
              >
                {getActivityInvestigationQuestion(selectedResult.increase, selectedResult.actor)}
              </EuiTextColor>
            )}
            {getInterval(selectedResult)}
          </p>
        </div>
        {analysis?.groupAnalysisIncomplete && <p>{messages.incompleteGroups()}</p>}
        {!canOpenChat && <p>{messages.chatUnavailable()}</p>}
        {error && (
          <p role="alert" css={css({ color: euiTheme.colors.textDanger })}>
            {error}
          </p>
        )}
      </EuiText>
    </EuiPanel>
  );
};

export const DiscoverActivityInvestigation = (): ReactElement | null => {
  const { core } = useDiscoverServices();

  return core.featureFlags.getBooleanValue(ACTIVITY_INVESTIGATION_FEATURE_FLAG, false) ? (
    <ActivityInvestigation />
  ) : null;
};

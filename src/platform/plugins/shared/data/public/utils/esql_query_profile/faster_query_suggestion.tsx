/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { HttpStart } from '@kbn/core/public';
import { KbnDangerCallout } from '@kbn/ui-callout';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ISearchStart } from '../../search';
import type { QueryProfileView } from './aggregate_esql_profile';
import { compareResults } from './compare_results';
import type { ResultsVerdict } from './compare_results';
import { loadEsqlQueryProfile } from './load_esql_query_profile';
import { ProfileComparisonPanel } from './profile_comparison';
import { checkFasterQueryAvailable, suggestFasterQuery } from './suggest_faster_query';

type Stage =
  | { kind: 'idle' }
  | { kind: 'suggesting' }
  | { kind: 'noSuggestion'; reason: string }
  | { kind: 'suggested'; query: string; reason: string }
  | { kind: 'profiling'; query: string; reason: string }
  | { kind: 'compared'; query: string; reason: string; view: QueryProfileView }
  | { kind: 'error'; message: string };

const errorMessage = (caught: unknown): string =>
  caught instanceof Error && caught.message
    ? caught.message
    : i18n.translate('data.inspector.queryProfile.suggestionFailedMessage', {
        defaultMessage: 'Something went wrong while checking the suggested query.',
      });

/** Flush left aligns a lone button with the text above it. Next to another button it needs its padding. */
function DismissButton({ onClick, isAlone = true }: { onClick: () => void; isAlone?: boolean }) {
  return (
    <EuiButtonEmpty
      size="xs"
      flush={isAlone ? 'left' : undefined}
      onClick={onClick}
      data-test-subj="esqlQueryProfileDismissSuggestion"
    >
      <FormattedMessage
        id="data.inspector.queryProfile.dismissButtonLabel"
        defaultMessage="Dismiss"
      />
    </EuiButtonEmpty>
  );
}

function Busy({ children }: { children: React.ReactNode }) {
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner size="m" />
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiText size="xs">{children}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

/** A query that returns different results is not offered as a replacement. */
const isMismatch = (original: QueryProfileView, suggested: QueryProfileView): boolean => {
  const verdict = compareResults(original.results, suggested.results);
  return verdict !== undefined && verdict.kind !== 'same';
};

function ResultsCheck({ verdict }: { verdict: ResultsVerdict | undefined }) {
  if (!verdict) {
    return (
      <EuiText size="xs" color="subdued" data-test-subj="esqlQueryProfileResultsCheck">
        <FormattedMessage
          id="data.inspector.queryProfile.resultsNotComparedDescription"
          defaultMessage="The results could not be compared."
        />
      </EuiText>
    );
  }

  const text =
    verdict.kind === 'same'
      ? verdict.sameOrder
        ? i18n.translate('data.inspector.queryProfile.sameResultsLabel', {
            defaultMessage: 'Same results: {rowCount, plural, one {# row} other {# rows}}.',
            values: { rowCount: verdict.rowCount },
          })
        : i18n.translate('data.inspector.queryProfile.sameResultsOtherOrderLabel', {
            defaultMessage:
              'Same results: {rowCount, plural, one {# row} other {# rows}}, in a different order.',
            values: { rowCount: verdict.rowCount },
          })
      : verdict.kind === 'differentColumns'
      ? i18n.translate('data.inspector.queryProfile.differentColumnsLabel', {
          defaultMessage:
            'The columns differ from the original query, so this is not an equivalent query.',
        })
      : verdict.kind === 'differentRowCount'
      ? i18n.translate('data.inspector.queryProfile.differentRowCountLabel', {
          defaultMessage:
            'It returns {current, plural, one {# row} other {# rows}} and the original returned {baseline}. This is not an equivalent query.',
          values: { current: verdict.current, baseline: verdict.baseline },
        })
      : i18n.translate('data.inspector.queryProfile.differentRowsLabel', {
          defaultMessage:
            'The number of rows matches but the values differ. Without a SORT, rows beyond the limit can vary between runs, otherwise this is not an equivalent query.',
        });

  return (
    <EuiText
      size="xs"
      color={verdict.kind === 'same' ? 'success' : 'danger'}
      data-test-subj="esqlQueryProfileResultsCheck"
    >
      <strong>{text}</strong>
    </EuiText>
  );
}

/**
 * Asks the AI for a faster query, runs it with profiling only when the user asks, and compares
 * its time and its results with the profiled original.
 */
export function FasterQuerySuggestion({
  http,
  search,
  requestJson,
  originalQuery,
  originalView,
  onApplyQuery,
}: {
  http: Pick<HttpStart, 'get' | 'post'>;
  search: Pick<ISearchStart, 'esql'>;
  requestJson: object;
  originalQuery: string;
  originalView: QueryProfileView;
  /** Puts a query in the editor. Without it the suggestion can only be copied. */
  onApplyQuery?: (query: string) => void;
}) {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    checkFasterQueryAvailable(http).then((available) => {
      if (isCurrent) {
        setIsAvailable(available);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [http]);
  const controller = useRef<AbortController | undefined>();

  const cancel = () => {
    controller.current?.abort();
    controller.current = undefined;
  };
  const start = () => {
    cancel();
    controller.current = new AbortController();
    return controller.current.signal;
  };

  // A new profile of the original query makes any earlier suggestion stale.
  useEffect(() => {
    cancel();
    setStage({ kind: 'idle' });
  }, [originalView]);
  useEffect(() => cancel, []);

  const suggest = async () => {
    const signal = start();
    setStage({ kind: 'suggesting' });
    try {
      const suggestion = await suggestFasterQuery({
        http,
        query: originalQuery,
        view: originalView,
        abortSignal: signal,
      });
      if (signal.aborted) {
        return;
      }
      setStage(
        suggestion.query
          ? { kind: 'suggested', query: suggestion.query, reason: suggestion.reason }
          : { kind: 'noSuggestion', reason: suggestion.reason }
      );
    } catch (caught: unknown) {
      if (!signal.aborted) {
        setStage({ kind: 'error', message: errorMessage(caught) });
      }
    }
  };

  const profileSuggestion = async (query: string, reason: string) => {
    const signal = start();
    setStage({ kind: 'profiling', query, reason });
    try {
      const view = await loadEsqlQueryProfile({
        search,
        requestJson: { ...requestJson, query },
        abortSignal: signal,
      });
      if (!signal.aborted) {
        setStage({ kind: 'compared', query, reason, view });
      }
    } catch (caught: unknown) {
      if (!signal.aborted) {
        setStage({ kind: 'error', message: errorMessage(caught) });
      }
    }
  };

  const dismiss = () => {
    cancel();
    setStage({ kind: 'idle' });
  };

  if (!isAvailable) {
    return null;
  }

  if (stage.kind === 'idle') {
    // The wrapper keeps the button at its own width instead of stretching across the row.
    return (
      <div>
        <EuiButtonEmpty
          size="xs"
          flush="left"
          iconType="sparkles"
          onClick={suggest}
          data-test-subj="esqlQueryProfileSuggest"
        >
          <FormattedMessage
            id="data.inspector.queryProfile.suggestButtonLabel"
            defaultMessage="Suggest a faster query"
          />
        </EuiButtonEmpty>
      </div>
    );
  }

  return (
    <>
      <EuiPanel
        color="subdued"
        hasBorder
        hasShadow={false}
        paddingSize="s"
        data-test-subj="esqlQueryProfileSuggestion"
      >
        <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="sparkles" size="s" aria-hidden="true" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="xs">
              <strong>
                <FormattedMessage
                  id="data.inspector.queryProfile.aiSuggestionTitle"
                  defaultMessage="AI suggestion"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        {stage.kind === 'suggesting' ? (
          <Busy>
            <FormattedMessage
              id="data.inspector.queryProfile.suggestingDescription"
              defaultMessage="Asking the AI for a faster version of this query."
            />
          </Busy>
        ) : stage.kind === 'error' ? (
          <>
            <KbnDangerCallout
              announceOnMount
              title={i18n.translate('data.inspector.queryProfile.suggestionErrorTitle', {
                defaultMessage: 'Unable to suggest a faster query',
              })}
              text={<p>{stage.message}</p>}
            />
            <EuiSpacer size="s" />
            <DismissButton onClick={dismiss} />
          </>
        ) : stage.kind === 'noSuggestion' ? (
          <>
            <EuiText size="xs" data-test-subj="esqlQueryProfileNoSuggestion">
              <p>
                <FormattedMessage
                  id="data.inspector.queryProfile.noSuggestionDescription"
                  defaultMessage="No safe improvement found. {reason}"
                  values={{ reason: stage.reason }}
                />
              </p>
            </EuiText>
            <DismissButton onClick={dismiss} />
          </>
        ) : (
          <>
            <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
              {stage.query}
            </EuiCodeBlock>
            <EuiSpacer size="xs" />
            <EuiText size="xs" color="subdued">
              <p data-test-subj="esqlQueryProfileSuggestionReason">{stage.reason}</p>
            </EuiText>
            <EuiSpacer size="s" />
            {stage.kind === 'suggested' ? (
              <>
                <EuiText size="xs" color="subdued">
                  <FormattedMessage
                    id="data.inspector.queryProfile.suggestionNotRunDescription"
                    defaultMessage="This query has not been run. The AI can be wrong, so check that it returns the same results."
                  />
                </EuiText>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      flush="left"
                      iconType="play"
                      onClick={() => profileSuggestion(stage.query, stage.reason)}
                      data-test-subj="esqlQueryProfileProfileSuggestion"
                    >
                      <FormattedMessage
                        id="data.inspector.queryProfile.profileSuggestionButtonLabel"
                        defaultMessage="Profile this suggestion"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <DismissButton onClick={dismiss} isAlone={false} />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </>
            ) : stage.kind === 'profiling' ? (
              <Busy>
                <FormattedMessage
                  id="data.inspector.queryProfile.profilingSuggestionDescription"
                  defaultMessage="Running the suggested query with profiling."
                />
              </Busy>
            ) : (
              <>
                <ResultsCheck verdict={compareResults(originalView.results, stage.view.results)} />
                {onApplyQuery && !isMismatch(originalView, stage.view) ? (
                  <>
                    <EuiSpacer size="xs" />
                    <EuiButtonEmpty
                      size="xs"
                      flush="left"
                      iconType="check"
                      onClick={() => onApplyQuery(stage.query)}
                      data-test-subj="esqlQueryProfileApplySuggestion"
                    >
                      <FormattedMessage
                        id="data.inspector.queryProfile.applySuggestionButtonLabel"
                        defaultMessage="Use this query"
                      />
                    </EuiButtonEmpty>
                  </>
                ) : null}
                <EuiSpacer size="m" />
                <ProfileComparisonPanel
                  baseline={{ view: originalView, query: originalQuery }}
                  current={stage.view}
                  currentQuery={stage.query}
                  baselineLabel={i18n.translate(
                    'data.inspector.queryProfile.originalQueryComparisonTitle',
                    { defaultMessage: 'Compared with the original query' }
                  )}
                />
                <DismissButton onClick={dismiss} />
              </>
            )}
          </>
        )}
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
}

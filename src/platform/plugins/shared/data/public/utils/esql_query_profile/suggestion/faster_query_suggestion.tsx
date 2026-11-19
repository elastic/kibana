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
import { AiRequestFailure, readRequestErrorMessage } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { ISearchStart } from '../../../search';
import type { QueryProfileView } from '../profile/types';
import { compareResults } from './compare_results';
import { loadEsqlQueryProfile } from '../profile/load_esql_query_profile';
import { ResultsCheck, TimeComparison } from './suggestion_comparison';
import { suggestFasterQuery } from './suggest_faster_query';

type Stage =
  | { kind: 'idle' }
  | { kind: 'suggesting' }
  | { kind: 'noSuggestion'; reason: string }
  | { kind: 'suggested'; query: string; reason: string; error?: string }
  | { kind: 'profiling'; query: string; reason: string }
  | { kind: 'compared'; query: string; reason: string; view: QueryProfileView }
  | { kind: 'error'; message: string; isNoConnector: boolean };

const failureMessage = (caught: unknown): string =>
  readRequestErrorMessage(
    caught,
    i18n.translate('data.inspector.queryProfile.suggestionFailedMessage', {
      defaultMessage: 'Something went wrong while checking the suggested query.',
    })
  );

const failedWith = (caught: unknown): Stage => ({
  kind: 'error',
  message: failureMessage(caught),
  isNoConnector: caught instanceof AiRequestFailure && caught.isNoConnector,
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

function FailureCallout({ title, message }: { title: string; message: string }) {
  return <KbnDangerCallout announceOnMount title={title} text={<p>{message}</p>} />;
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

type SuggestedStage = Extract<Stage, { kind: 'suggested' | 'profiling' | 'compared' }>;

interface SuggestionBodyProps {
  stage: Stage;
  originalView: QueryProfileView;
  connectorsUrl?: string;
  onProfile: (query: string, reason: string) => void;
  onDismiss: () => void;
}

/** The suggested query and why it should be faster, then what can be done with it. */
function SuggestedQuery({
  stage,
  originalView,
  onProfile,
  onDismiss,
}: Omit<SuggestionBodyProps, 'stage'> & { stage: SuggestedStage }) {
  return (
    <>
      <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" isCopyable>
        {stage.query}
      </EuiCodeBlock>
      <EuiSpacer size="xs" />
      <EuiText size="xs" color="subdued">
        <p data-test-subj="esqlQueryProfileSuggestionReason">{stage.reason}</p>
      </EuiText>
      <EuiSpacer size="s" />
      {stage.kind === 'suggested' && (
        <>
          {stage.error ? (
            <FailureCallout
              title={i18n.translate('data.inspector.queryProfile.suggestionRunFailedTitle', {
                defaultMessage: 'Unable to run the suggested query',
              })}
              message={stage.error}
            />
          ) : (
            <EuiText size="xs" color="subdued">
              <FormattedMessage
                id="data.inspector.queryProfile.suggestionNotRunDescription"
                defaultMessage="This query has not been run. The AI can be wrong, so check that it returns the same results."
              />
            </EuiText>
          )}
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                flush="left"
                iconType="play"
                onClick={() => onProfile(stage.query, stage.reason)}
                data-test-subj="esqlQueryProfileProfileSuggestion"
              >
                <FormattedMessage
                  id="data.inspector.queryProfile.profileSuggestionButtonLabel"
                  defaultMessage="Profile this suggestion"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <DismissButton onClick={onDismiss} isAlone={false} />
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
      {stage.kind === 'profiling' && (
        <Busy>
          <FormattedMessage
            id="data.inspector.queryProfile.profilingSuggestionDescription"
            defaultMessage="Running the suggested query with profiling."
          />
        </Busy>
      )}
      {stage.kind === 'compared' && (
        <>
          <ResultsCheck verdict={compareResults(originalView.results, stage.view.results)} />
          <EuiSpacer size="m" />
          <TimeComparison original={originalView} suggested={stage.view} />
          <EuiSpacer size="s" />
          <DismissButton onClick={onDismiss} />
        </>
      )}
    </>
  );
}

/** What the panel shows for each stage of asking for, and then checking, a suggestion. */
function SuggestionBody({
  stage,
  originalView,
  connectorsUrl,
  onProfile,
  onDismiss,
}: SuggestionBodyProps) {
  switch (stage.kind) {
    case 'idle':
      return null;
    case 'suggesting':
      return (
        <Busy>
          <FormattedMessage
            id="data.inspector.queryProfile.suggestingDescription"
            defaultMessage="Asking the AI for a faster version of this query."
          />
        </Busy>
      );
    case 'error':
      // A missing connector is something to set up, not a failure, so it is not shown as an error.
      if (stage.isNoConnector) {
        return (
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" wrap>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="data.inspector.queryProfile.noConnectorMessage"
                  defaultMessage="No AI connector is set up."
                />
              </EuiText>
            </EuiFlexItem>
            {connectorsUrl ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="plugs"
                  href={connectorsUrl}
                  data-test-subj="esqlQueryProfileSetUpConnector"
                >
                  <FormattedMessage
                    id="data.inspector.queryProfile.setUpConnectorLabel"
                    defaultMessage="Set up a connector"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              <DismissButton onClick={onDismiss} />
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      }
      return (
        <>
          <FailureCallout
            title={i18n.translate('data.inspector.queryProfile.suggestionErrorTitle', {
              defaultMessage: 'Unable to suggest a faster query',
            })}
            message={stage.message}
          />
          <EuiSpacer size="s" />
          <DismissButton onClick={onDismiss} />
        </>
      );
    case 'noSuggestion':
      return (
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
          <DismissButton onClick={onDismiss} />
        </>
      );
    default:
      return (
        <SuggestedQuery
          stage={stage}
          originalView={originalView}
          onProfile={onProfile}
          onDismiss={onDismiss}
        />
      );
  }
}

/**
 * Asks the AI for a faster query, runs it with profiling only when the user asks, and compares
 * its time and its results with the profiled original. The suggestion is only shown, never applied.
 */
export function FasterQuerySuggestion({
  http,
  search,
  requestJson,
  originalQuery,
  originalView,
  connectorsUrl,
}: {
  http: Pick<HttpStart, 'post'>;
  search: Pick<ISearchStart, 'esql'>;
  requestJson: object;
  originalQuery: string;
  originalView: QueryProfileView;
  /** Where to set up an AI connector, when the user may. Shown when there is none. */
  connectorsUrl?: string;
}) {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });

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
        setStage(failedWith(caught));
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
      // The suggestion stays, with what went wrong, so that it can be copied or tried again.
      if (!signal.aborted) {
        setStage({ kind: 'suggested', query, reason, error: failureMessage(caught) });
      }
    }
  };

  const dismiss = () => {
    cancel();
    setStage({ kind: 'idle' });
  };

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
        <SuggestionBody
          stage={stage}
          originalView={originalView}
          connectorsUrl={connectorsUrl}
          onProfile={profileSuggestion}
          onDismiss={dismiss}
        />
      </EuiPanel>
      <EuiSpacer size="m" />
    </>
  );
}

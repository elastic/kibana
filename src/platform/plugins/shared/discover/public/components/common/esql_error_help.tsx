/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCodeBlock,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { HttpStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import type { EsqlErrorExplanation } from './explain_esql_error';
import { ExplainErrorFailure, explainEsqlError } from './explain_esql_error';

type Stage =
  | { kind: 'idle' }
  | { kind: 'explaining' }
  | { kind: 'explained'; explanation: EsqlErrorExplanation }
  | { kind: 'error'; message: string; isNoConnector: boolean };

const leftAligned = css`
  text-align: left;
`;

/** Offers to explain an ES|QL error with the AI and to apply a corrected query. */
export function EsqlErrorHelp({
  http,
  query,
  errorMessage,
  onApplyQuery,
  connectorsUrl,
}: {
  http: Pick<HttpStart, 'post'>;
  query: string;
  errorMessage: string;
  onApplyQuery?: (query: string) => void;
  connectorsUrl?: string;
}) {
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const controller = useRef<AbortController | undefined>();

  const cancel = useCallback(() => {
    controller.current?.abort();
    controller.current = undefined;
  }, []);

  useEffect(() => {
    cancel();
    setStage({ kind: 'idle' });
  }, [query, errorMessage, cancel]);
  useEffect(() => cancel, [cancel]);

  const explain = async () => {
    cancel();
    controller.current = new AbortController();
    const { signal } = controller.current;
    setStage({ kind: 'explaining' });
    try {
      const explanation = await explainEsqlError({
        http,
        query,
        errorMessage,
        abortSignal: signal,
      });
      if (!signal.aborted) {
        setStage({ kind: 'explained', explanation });
      }
    } catch (caught: unknown) {
      if (!signal.aborted) {
        setStage({
          kind: 'error',
          message: caught instanceof Error ? caught.message : String(caught),
          isNoConnector: caught instanceof ExplainErrorFailure && caught.isNoConnector,
        });
      }
    }
  };

  const dismiss = () => {
    cancel();
    setStage({ kind: 'idle' });
  };

  if (stage.kind === 'idle') {
    return (
      <div
        css={css`
          display: flex;
          justify-content: center;
        `}
      >
        <EuiButtonEmpty
          size="s"
          iconType="sparkles"
          onClick={explain}
          data-test-subj="discoverErrorExplainButton"
        >
          <FormattedMessage
            id="discover.esqlErrorHelp.explainButtonLabel"
            defaultMessage="Explain with AI"
          />
        </EuiButtonEmpty>
      </div>
    );
  }

  return (
    <EuiPanel
      color="subdued"
      hasBorder
      hasShadow={false}
      paddingSize="s"
      css={leftAligned}
      data-test-subj="discoverErrorExplanation"
    >
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiIcon type="sparkles" size="s" aria-hidden="true" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText size="s">
            <strong>
              <FormattedMessage id="discover.esqlErrorHelp.title" defaultMessage="AI explanation" />
            </strong>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      {stage.kind === 'explaining' ? (
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="m" />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <FormattedMessage
                id="discover.esqlErrorHelp.explainingDescription"
                defaultMessage="Reading the error and the query."
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : stage.kind === 'error' ? (
        <>
          <EuiText size="s" color="danger" data-test-subj="discoverErrorExplanationFailure">
            <p>
              {stage.isNoConnector ? (
                <FormattedMessage
                  id="discover.esqlErrorHelp.noConnectorMessage"
                  defaultMessage="No AI connector is set up."
                />
              ) : (
                stage.message
              )}
            </p>
          </EuiText>
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty size="xs" flush="left" onClick={dismiss}>
                <FormattedMessage
                  id="discover.esqlErrorHelp.dismissButtonLabel"
                  defaultMessage="Dismiss"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            {stage.isNoConnector && connectorsUrl ? (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="plugs"
                  href={connectorsUrl}
                  data-test-subj="discoverErrorExplanationSetUpConnector"
                >
                  <FormattedMessage
                    id="discover.esqlErrorHelp.setUpConnectorLabel"
                    defaultMessage="Set up a connector"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </>
      ) : (
        <>
          <EuiText size="s">
            <p data-test-subj="discoverErrorExplanationSummary">{stage.explanation.summary}</p>
            {stage.explanation.suggestions.length > 0 ? (
              <ul data-test-subj="discoverErrorExplanationSuggestions">
                {stage.explanation.suggestions.map((suggestion, index) => (
                  <li key={`${index}-${suggestion}`}>{suggestion}</li>
                ))}
              </ul>
            ) : null}
          </EuiText>
          {stage.explanation.query ? (
            <>
              <EuiFlexGroup
                gutterSize="xs"
                justifyContent="flexEnd"
                alignItems="center"
                responsive={false}
              >
                {onApplyQuery ? (
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      size="xs"
                      iconType="play"
                      onClick={() =>
                        stage.explanation.query && onApplyQuery(stage.explanation.query)
                      }
                      data-test-subj="discoverErrorExplanationApply"
                    >
                      <FormattedMessage
                        id="discover.esqlErrorHelp.applyButtonLabel"
                        defaultMessage="Run query"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                ) : null}
                <EuiFlexItem grow={false}>
                  <EuiCopy textToCopy={stage.explanation.query}>
                    {(copy) => (
                      <EuiButtonEmpty
                        size="xs"
                        iconType="copy"
                        onClick={copy}
                        data-test-subj="discoverErrorExplanationCopy"
                      >
                        <FormattedMessage
                          id="discover.esqlErrorHelp.copyButtonLabel"
                          defaultMessage="Copy"
                        />
                      </EuiButtonEmpty>
                    )}
                  </EuiCopy>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiPanel color="plain" hasBorder hasShadow={false} paddingSize="none">
                <EuiCodeBlock language="esql" fontSize="s" paddingSize="s" transparentBackground>
                  {stage.explanation.query}
                </EuiCodeBlock>
              </EuiPanel>
              <EuiSpacer size="xs" />
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="discover.esqlErrorHelp.notRunDescription"
                  defaultMessage="This query has not been run. The AI can be wrong, so check it before you rely on the results."
                />
              </EuiText>
              <EuiSpacer size="s" />
            </>
          ) : null}
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                flush="left"
                onClick={dismiss}
                data-test-subj="discoverErrorExplanationDismiss"
              >
                <FormattedMessage
                  id="discover.esqlErrorHelp.dismissButtonLabel"
                  defaultMessage="Dismiss"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>
        </>
      )}
    </EuiPanel>
  );
}

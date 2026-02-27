/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { TryInConsoleButton } from '@kbn/try-in-console';
import type { DashboardState } from '../../server';
import { getSanitizedExportSource } from './dashboard_export_source_client';
import { buildCreateDashboardRequestForConsole } from './export_source_share_utils';
import { coreServices, shareService } from '../services/kibana_services';

export interface ExportSourceAssetPanelProps {
  dashboardState: DashboardState;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'success'; data: DashboardState; warnings: string[] }
  | { status: 'error'; errorMessage: string };

function useSanitizedExportSource({
  dashboardState,
  onLoadStart,
}: {
  dashboardState: DashboardState;
  onLoadStart?: () => void;
}): { loadState: LoadState; retry: () => void } {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [requestNonce, setRequestNonce] = useState(0);

  const retry = useCallback(() => {
    setRequestNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;
    setLoadState({ status: 'loading' });
    onLoadStart?.();

    getSanitizedExportSource(dashboardState)
      .then(({ data, warnings }) => {
        if (!isMounted) return;
        setLoadState({ status: 'success', data, warnings });
      })
      .catch((e) => {
        if (!isMounted) return;
        const errorMessage = e instanceof Error ? e.message : String(e);
        setLoadState({
          status: 'error',
          errorMessage,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [dashboardState, requestNonce, onLoadStart]);

  return { loadState, retry };
}

function WarningsCallout({
  warnings,
  accordionId,
  isExpanded,
  setIsExpanded,
  isVisible,
  onDismiss,
}: {
  warnings: string[];
  accordionId: string;
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
  isVisible: boolean;
  onDismiss: () => void;
}) {
  if (!isVisible || !warnings.length) return null;

  return (
    <EuiFlexItem grow={false}>
      <EuiCallOut
        color="warning"
        iconType="alert"
        title={i18n.translate('dashboard.exportSource.warningsTitle', {
          defaultMessage: 'Unsupported properties were removed',
        })}
        data-test-subj="dashboardExportSourceWarnings"
        onDismiss={onDismiss}
      >
        <EuiText size="s" color="subdued">
          {i18n.translate('dashboard.exportSource.warningsSummary', {
            defaultMessage:
              '{count} item{count, plural, one {} other {s}} removed from the JSON source.',
            values: { count: warnings.length },
          })}
        </EuiText>

        <EuiAccordion
          id={accordionId}
          initialIsOpen={false}
          onToggle={setIsExpanded}
          paddingSize="s"
          buttonContent={
            isExpanded
              ? i18n.translate('dashboard.exportSource.warningsAccordionHide', {
                  defaultMessage: 'Hide details',
                })
              : i18n.translate('dashboard.exportSource.warningsAccordionShow', {
                  defaultMessage: 'Show details',
                })
          }
        >
          {isExpanded ? (
            <div
              className="eui-yScrollWithShadows"
              css={{
                maxHeight: 240,
                overflowY: 'auto',
                ul: {
                  marginBottom: 0,
                },
              }}
            >
              <EuiText size="s" data-test-subj="dashboardExportSourceWarningsList">
                <ul>
                  {warnings.map((warning, idx) => (
                    <li key={`${idx}-${warning}`}>{warning}</li>
                  ))}
                </ul>
              </EuiText>
            </div>
          ) : null}
        </EuiAccordion>
      </EuiCallOut>
    </EuiFlexItem>
  );
}

function LoadingState() {
  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      justifyContent="center"
      css={{ height: '100%' }}
      gutterSize="s"
    >
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner
          size="xl"
          data-test-subj="dashboardExportSourceLoading"
          aria-label={i18n.translate('dashboard.exportSource.loadingLabel', {
            defaultMessage: 'Loading JSON source',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {i18n.translate('dashboard.exportSource.loadingText', {
            defaultMessage: 'Loading JSON source...',
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function SuccessState({
  openInConsoleRequest,
  jsonValue,
}: {
  openInConsoleRequest: string;
  jsonValue: string;
}) {
  return (
    <EuiFlexGroup direction="column" gutterSize="xs" css={{ height: '100%' }}>
      <EuiFlexItem grow={false} css={{ alignSelf: 'flex-end' }}>
        <TryInConsoleButton
          request={openInConsoleRequest}
          application={coreServices.application}
          sharePlugin={shareService}
          type="emptyButton"
          iconType="wrench"
          content={i18n.translate('dashboard.exportSource.openInConsoleButtonLabel', {
            defaultMessage: 'Open in Console',
          })}
          data-test-subj="dashboardExportSourceOpenInConsoleButton"
        />
      </EuiFlexItem>
      <EuiFlexItem grow css={{ minHeight: 0 }}>
        <EuiCodeBlock
          data-test-subj="exportAssetValue"
          css={{ overflowWrap: 'break-word' }}
          overflowHeight="100%"
          language="json"
          whiteSpace="pre"
          isCopyable
          isVirtualized
          copyAriaLabel={i18n.translate('dashboard.exportSource.copyAriaLabel', {
            defaultMessage: 'Copy JSON source',
          })}
          aria-label={i18n.translate('dashboard.exportSource.codeBlockAriaLabel', {
            defaultMessage: 'Export JSON source',
          })}
        >
          {jsonValue}
        </EuiCodeBlock>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function ErrorState({ errorMessage, onRetry }: { errorMessage: string; onRetry: () => void }) {
  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      justifyContent="center"
      css={{ height: '100%' }}
      gutterSize="none"
    >
      <EuiFlexItem grow={false} css={{ maxWidth: 560 }}>
        <EuiEmptyPrompt
          iconType="error"
          color="danger"
          titleSize="xs"
          data-test-subj="dashboardExportSourceSanitizeErrorPrompt"
          title={
            <h3>
              {i18n.translate('dashboard.exportSource.sanitizeErrorTitle', {
                defaultMessage: 'Unable to export',
              })}
            </h3>
          }
          body={
            <EuiText
              size="s"
              color="subdued"
              css={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}
            >
              <p>
                {i18n.translate('dashboard.exportSource.sanitizeErrorBody', {
                  defaultMessage: 'Sorry, there was an error loading the JSON source.',
                })}
              </p>
              <p>
                {i18n.translate('dashboard.exportSource.sanitizeErrorDetails', {
                  defaultMessage: 'Error: {errorMessage}',
                  values: { errorMessage },
                })}
              </p>
            </EuiText>
          }
          actions={
            <EuiButton
              color="danger"
              iconType="refresh"
              onClick={onRetry}
              data-test-subj="dashboardExportSourceRetryButton"
            >
              {i18n.translate('dashboard.exportSource.retryButtonLabel', {
                defaultMessage: 'Retry',
              })}
            </EuiButton>
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const ExportSourceAssetPanel = ({ dashboardState }: ExportSourceAssetPanelProps) => {
  const warningsAccordionId = useGeneratedHtmlId({ prefix: 'dashboardExportSourceWarnings' });
  const [isWarningsExpanded, setIsWarningsExpanded] = useState(false);
  const [showWarningsCallout, setShowWarningsCallout] = useState(true);

  const onLoadStart = useCallback(() => {
    setIsWarningsExpanded(false);
    setShowWarningsCallout(true);
  }, []);

  const { loadState, retry } = useSanitizedExportSource({ dashboardState, onLoadStart });

  const warnings = loadState.status === 'success' ? loadState.warnings : [];
  const sanitizedState = loadState.status === 'success' ? loadState.data : undefined;

  const jsonValue = useMemo(
    () => JSON.stringify(sanitizedState ?? dashboardState, null, 2),
    [sanitizedState, dashboardState]
  );

  const openInConsoleRequest = useMemo(() => {
    return buildCreateDashboardRequestForConsole(jsonValue);
  }, [jsonValue]);

  return (
    <EuiFlexItem grow css={{ minHeight: 0 }}>
      <EuiFlexGroup direction="column" gutterSize="s" css={{ flex: '1 1 auto', minHeight: 0 }}>
        <WarningsCallout
          warnings={warnings}
          accordionId={warningsAccordionId}
          isExpanded={isWarningsExpanded}
          setIsExpanded={setIsWarningsExpanded}
          isVisible={showWarningsCallout}
          onDismiss={() => {
            setShowWarningsCallout(false);
            setIsWarningsExpanded(false);
          }}
        />

        <EuiFlexItem grow css={{ minHeight: 0 }}>
          {loadState.status === 'loading' ? (
            <LoadingState />
          ) : loadState.status === 'success' ? (
            <SuccessState openInConsoleRequest={openInConsoleRequest} jsonValue={jsonValue} />
          ) : (
            <ErrorState errorMessage={loadState.errorMessage} onRetry={retry} />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

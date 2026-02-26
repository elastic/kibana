/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
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
import { DASHBOARD_API_PATH } from '../../common/constants';
import { getSanitizedExportSource } from './dashboard_export_source_client';
import { coreServices, shareService } from '../services/kibana_services';

export interface ExportSourceAssetPanelProps {
  title: string;
  dashboardState: DashboardState;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'success'; data: DashboardState; warnings: string[] }
  | { status: 'error'; errorMessage: string };

const WARNING_LIST_MAX_HEIGHT = 240;

export const ExportSourceAssetPanel = ({
  title,
  dashboardState,
}: ExportSourceAssetPanelProps) => {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const warningsAccordionId = useGeneratedHtmlId({ prefix: 'dashboardExportSourceWarnings' });
  const [isWarningsExpanded, setIsWarningsExpanded] = useState(false);
  const [showWarningsCallout, setShowWarningsCallout] = useState(true);
  const [requestNonce, setRequestNonce] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setLoadState({ status: 'loading' });
    setIsWarningsExpanded(false);
    setShowWarningsCallout(true);

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
  }, [dashboardState, requestNonce]);

  const warnings =
    loadState.status === 'success' ? loadState.warnings : [];
  const sanitizedState = loadState.status === 'success' ? loadState.data : undefined;

  const jsonValue = useMemo(
    () => JSON.stringify(sanitizedState ?? dashboardState, null, 2),
    [sanitizedState, dashboardState]
  );

  const openInConsoleRequest = useMemo(() => {
    const requestBody = JSON.stringify(dashboardState, null, 2);
    return `POST kbn:${DASHBOARD_API_PATH}\n${requestBody}`;
  }, [dashboardState]);

  return (
    <EuiFlexItem grow css={{ minHeight: 0 }}>
      <EuiFlexGroup direction="column" gutterSize="s" css={{ flex: '1 1 auto', minHeight: 0 }}>
        {showWarningsCallout && warnings.length ? (
          <EuiFlexItem grow={false}>
            <EuiCallOut
              color="warning"
              iconType="alert"
              title={i18n.translate('dashboard.exportSource.warningsTitle', {
                defaultMessage: 'Unsupported properties were removed',
              })}
              data-test-subj="dashboardExportSourceWarnings"
              onDismiss={() => {
                setShowWarningsCallout(false);
                setIsWarningsExpanded(false);
              }}
            >
              <EuiText size="s" color="subdued">
                {i18n.translate('dashboard.exportSource.warningsSummary', {
                  defaultMessage:
                    '{count} item{count, plural, one {} other {s}} removed from the JSON source.',
                  values: { count: warnings.length },
                })}
              </EuiText>

              <EuiAccordion
                id={warningsAccordionId}
                initialIsOpen={false}
                onToggle={setIsWarningsExpanded}
                buttonContent={
                  isWarningsExpanded
                    ? i18n.translate('dashboard.exportSource.warningsAccordionHide', {
                        defaultMessage: 'Hide details',
                      })
                    : i18n.translate('dashboard.exportSource.warningsAccordionShow', {
                        defaultMessage: 'Show details',
                      })
                }
              >
                {isWarningsExpanded ? (
                  <EuiText
                    size="s"
                    css={{
                      maxHeight: WARNING_LIST_MAX_HEIGHT,
                      overflowY: 'auto',
                      paddingRight: 8,
                      paddingBottom: 8,
                      marginTop: 8,
                      ul: {
                        marginBottom: 0,
                      },
                    }}
                    data-test-subj="dashboardExportSourceWarningsList"
                  >
                    <ul>
                      {warnings.map((warning, idx) => (
                        <li key={`${idx}-${warning}`}>{warning}</li>
                      ))}
                    </ul>
                  </EuiText>
                ) : null}
              </EuiAccordion>
            </EuiCallOut>
          </EuiFlexItem>
        ) : null}

        <EuiFlexItem grow css={{ minHeight: 0 }}>
          {loadState.status === 'loading' ? (
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
                    defaultMessage: 'Checking panels for export compatibility…',
                  })}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : loadState.status === 'success' ? (
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
          ) : (
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
                          defaultMessage:
                            'Sorry, there was an error loading the JSON source.',
                        })}
                      </p>
                      <p>{errorMessageLabel(loadState.errorMessage)}</p>
                    </EuiText>
                  }
                  actions={
                    <EuiButton
                      color="danger"
                      iconType="refresh"
                      onClick={() => setRequestNonce((n) => n + 1)}
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
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

function errorMessageLabel(message: string) {
  return i18n.translate('dashboard.exportSource.sanitizeErrorMessage', {
    defaultMessage: 'Error: {message}',
    values: { message },
  });
}

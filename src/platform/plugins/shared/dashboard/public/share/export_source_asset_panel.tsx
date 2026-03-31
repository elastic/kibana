/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiCopy,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  euiYScrollWithShadows,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { XJsonLang } from '@kbn/monaco';
import { compressToEncodedURIComponent } from 'lz-string';
import { CodeEditor } from '@kbn/code-editor';
import type { DashboardState } from '../../server';
import { getSanitizedExportSource } from './dashboard_export_source_client';
import { buildCreateDashboardRequestForConsole } from './export_source_share_utils';
import { coreServices, shareService } from '../services/kibana_services';

export interface ExportSourceAssetPanelProps {
  dashboardState: DashboardState;
  onLoadStateChange?: (loadState: ExportSourceLoadState) => void;
}

export type ExportSourceLoadState =
  | { status: 'loading' }
  | { status: 'success'; data: DashboardState; warnings: string[] }
  | { status: 'error'; errorMessage: string };

function useSanitizedExportSource({
  dashboardState,
  onLoadStart,
}: {
  dashboardState: DashboardState;
  onLoadStart?: () => void;
}): { loadState: ExportSourceLoadState; retry: () => void } {
  const [loadState, setLoadState] = useState<ExportSourceLoadState>({ status: 'loading' });
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
        const warningMessages = warnings.map(({ message }) => message);
        setLoadState({ status: 'success', data, warnings: warningMessages });
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
  const euiThemeContext = useEuiTheme();

  const warningsListStyles = useMemo(
    () => css`
      ${euiYScrollWithShadows(euiThemeContext, { height: 'auto' })}
      max-height: 240px;
      padding-top: ${euiThemeContext.euiTheme.size.s};
      padding-bottom: ${euiThemeContext.euiTheme.size.s};
    `,
    [euiThemeContext]
  );

  if (!isVisible || !warnings.length) return null;

  return (
    <EuiFlexItem grow={false}>
      <EuiCallOut
        color="warning"
        iconType="alert"
        title={i18n.translate('dashboard.exportSource.warningsTitle', {
          defaultMessage: 'Unsupported properties were removed',
        })}
        size="s"
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
            <EuiText
              size="s"
              data-test-subj="dashboardExportSourceWarningsList"
              css={warningsListStyles}
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
  const useUrl = shareService?.url.locators.useUrl;

  const devToolsDataUri = compressToEncodedURIComponent(openInConsoleRequest);
  const consoleHref = useUrl?.(
    () => ({
      id: 'CONSOLE_APP_LOCATOR',
      params: {
        loadFrom: `data:text/plain,${devToolsDataUri}`,
      },
    }),
    [devToolsDataUri]
  );

  const canShowDevTools = Boolean(
    coreServices.application?.capabilities?.dev_tools?.show && consoleHref !== undefined
  );

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="s"
      wrap={false}
      responsive={false}
      css={css({
        '.react-monaco-editor-container': {
          flexGrow: 1, // Ensure the editor takes the full height of its flex container on Safari.
        },
      })}
      data-test-subj="exportAssetValue"
    >
      <EuiFlexItem grow={false}>
        <EuiSpacer size="s" />
        <EuiFlexGroup justifyContent="flexEnd" gutterSize="m" wrap>
          <EuiFlexItem grow={false}>
            <div>
              <EuiCopy textToCopy={jsonValue}>
                {(copy) => (
                  <EuiButtonEmpty
                    size="xs"
                    flush="right"
                    iconType="copyClipboard"
                    onClick={copy}
                    aria-label={i18n.translate('dashboard.exportSource.copyAriaLabel', {
                      defaultMessage: 'Copy JSON source',
                    })}
                    data-test-subj="dashboardExportSourceCopyButton"
                  >
                    {i18n.translate('dashboard.exportSource.copyButtonLabel', {
                      defaultMessage: 'Copy to clipboard',
                    })}
                  </EuiButtonEmpty>
                )}
              </EuiCopy>
            </div>
          </EuiFlexItem>
          {canShowDevTools ? (
            <EuiFlexItem grow={false}>
              <div>
                <EuiButtonEmpty
                  size="xs"
                  flush="right"
                  iconType="wrench"
                  href={consoleHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-test-subj="dashboardExportSourceOpenInConsoleButton"
                >
                  {i18n.translate('dashboard.exportSource.openInConsoleButtonLabel', {
                    defaultMessage: 'Open in Console',
                  })}
                </EuiButtonEmpty>
              </div>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <CodeEditor
          languageId={XJsonLang.ID}
          value={jsonValue}
          aria-label={i18n.translate('dashboard.exportSource.codeBlockAriaLabel', {
            defaultMessage: 'Export JSON source',
          })}
          options={{
            readOnly: true,
            lineNumbers: 'off',
            fontSize: 12,
            minimap: {
              enabled: false,
            },
            folding: true,
            scrollBeyondLastLine: false,
            glyphMargin: true,
            wordWrap: 'on',
            wrappingIndent: 'indent',
            automaticLayout: true,
          }}
        />
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
      <EuiFlexItem grow={false}>
        <EuiEmptyPrompt
          iconType="error"
          color="danger"
          titleSize="s"
          data-test-subj="dashboardExportSourceSanitizeErrorPrompt"
          title={
            <h3>
              {i18n.translate('dashboard.exportSource.sanitizeErrorTitle', {
                defaultMessage: 'Unable to export',
              })}
            </h3>
          }
          body={
            <EuiText size="s">
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

export const ExportSourceAssetPanel = ({
  dashboardState,
  onLoadStateChange,
}: ExportSourceAssetPanelProps) => {
  const warningsAccordionId = useGeneratedHtmlId({ prefix: 'dashboardExportSourceWarnings' });
  const [isWarningsExpanded, setIsWarningsExpanded] = useState(false);
  const [showWarningsCallout, setShowWarningsCallout] = useState(true);

  const onLoadStart = useCallback(() => {
    setIsWarningsExpanded(false);
    setShowWarningsCallout(true);
  }, []);

  const { loadState, retry } = useSanitizedExportSource({ dashboardState, onLoadStart });

  useEffect(() => {
    onLoadStateChange?.(loadState);
  }, [loadState, onLoadStateChange]);

  const warnings = loadState.status === 'success' ? loadState.warnings : [];
  const sanitizedState = loadState.status === 'success' ? loadState.data : undefined;

  const jsonValue = useMemo(() => JSON.stringify(sanitizedState, null, 2), [sanitizedState]);

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

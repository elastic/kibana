/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
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
import type { ExportJsonSanitizedState } from './types';
import { buildCreateDashboardRequestForConsole } from './export_json_share_utils';
import { coreServices, shareService } from '../services/kibana_services';

export type ExportJsonPanelProps = ExportJsonSanitizedState & { onRetry: () => void };

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
        title={i18n.translate('dashboard.exportJson.warningsTitle', {
          defaultMessage: 'Unsupported properties were removed',
        })}
        size="s"
        data-test-subj="dashboardExportSourceWarnings"
        onDismiss={onDismiss}
      >
        <EuiText size="s" color="subdued">
          {i18n.translate('dashboard.exportJson.warningsSummary', {
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
              ? i18n.translate('dashboard.exportJson.warningsAccordionHide', {
                  defaultMessage: 'Hide details',
                })
              : i18n.translate('dashboard.exportJson.warningsAccordionShow', {
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
          aria-label={i18n.translate('dashboard.exportJson.loadingLabel', {
            defaultMessage: 'Loading JSON source',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {i18n.translate('dashboard.exportJson.loadingText', {
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
                    aria-label={i18n.translate('dashboard.exportJson.copyAriaLabel', {
                      defaultMessage: 'Copy JSON source',
                    })}
                    data-test-subj="dashboardExportSourceCopyButton"
                  >
                    {i18n.translate('dashboard.exportJson.copyButtonLabel', {
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
                  {i18n.translate('dashboard.exportJson.openInConsoleButtonLabel', {
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
          aria-label={i18n.translate('dashboard.exportJson.codeBlockAriaLabel', {
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

function ErrorState({ error, onRetry }: { error: Error | undefined; onRetry: () => void }) {
  const errorMessage = error?.message ?? 'Unknown error';
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
              {i18n.translate('dashboard.exportJson.sanitizeErrorTitle', {
                defaultMessage: 'Unable to export',
              })}
            </h3>
          }
          body={
            <EuiText size="s">
              <p>
                {i18n.translate('dashboard.exportJson.sanitizeErrorBody', {
                  defaultMessage: 'Sorry, there was an error loading the JSON source.',
                })}
              </p>
              <p>
                {i18n.translate('dashboard.exportJson.sanitizeErrorDetails', {
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
              {i18n.translate('dashboard.exportJson.retryButtonLabel', {
                defaultMessage: 'Retry',
              })}
            </EuiButton>
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const ExportJsonPanel = ({
  status,
  data,
  warnings,
  error,
  onRetry,
}: ExportJsonPanelProps) => {
  const warningsAccordionId = useGeneratedHtmlId({ prefix: 'dashboardExportSourceWarnings' });
  const [isWarningsExpanded, setIsWarningsExpanded] = useState(false);
  const [showWarningsCallout, setShowWarningsCallout] = useState(true);

  useEffect(() => {
    if (status !== 'loading') return;
    setIsWarningsExpanded(false);
    setShowWarningsCallout(true);
  }, [status]);

  const jsonValue = useMemo(
    () => (status === 'success' && data !== undefined ? JSON.stringify(data, null, 2) : ''),
    [data, status]
  );

  const openInConsoleRequest = useMemo(
    () => buildCreateDashboardRequestForConsole(jsonValue),
    [jsonValue]
  );

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
          {status === 'loading' ? (
            <LoadingState />
          ) : status === 'success' ? (
            <SuccessState openInConsoleRequest={openInConsoleRequest} jsonValue={jsonValue} />
          ) : (
            <ErrorState error={error} onRetry={onRetry} />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

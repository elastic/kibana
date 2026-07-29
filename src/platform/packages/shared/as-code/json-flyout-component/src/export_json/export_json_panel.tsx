/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compressToEncodedURIComponent } from 'lz-string';
import React, { useEffect, useMemo, useState } from 'react';

import {
  EuiAccordion,
  EuiButton,
  EuiButtonEmpty,
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
import { css } from '@emotion/react';
import { CodeEditor, XJsonLang } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import type { ExportJsonOpenInConsoleConfig, ExportJsonSanitizedState } from './types';

export type ExportJsonPanelProps<SanitizedState extends object> =
  ExportJsonSanitizedState<SanitizedState> & {
    dataTestSubjPrefix: string;
    onRetry: () => void;
    openInConsole?: ExportJsonOpenInConsoleConfig;
  };

function WarningsCallout({
  warnings,
  accordionId,
  isExpanded,
  setIsExpanded,
  isVisible,
  onDismiss,
  dataTestSubjPrefix,
}: {
  warnings: string[];
  accordionId: string;
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
  isVisible: boolean;
  onDismiss: () => void;
  dataTestSubjPrefix: string;
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
      <KbnWarningCallout
        title={i18n.translate('asCodeExport.exportJson.warningsTitle', {
          defaultMessage: 'Unsupported properties were removed',
        })}
        text={i18n.translate('asCodeExport.exportJson.warningsSummary', {
          defaultMessage:
            '{count} item{count, plural, one {} other {s}} removed from the JSON source.',
          values: { count: warnings.length },
        })}
        size="s"
        data-test-subj={`${dataTestSubjPrefix}ExportSourceWarnings`}
        onDismiss={onDismiss}
      >
        <EuiAccordion
          id={accordionId}
          initialIsOpen={false}
          onToggle={setIsExpanded}
          paddingSize="s"
          buttonContent={
            isExpanded
              ? i18n.translate('asCodeExport.exportJson.warningsAccordionHide', {
                  defaultMessage: 'Hide details',
                })
              : i18n.translate('asCodeExport.exportJson.warningsAccordionShow', {
                  defaultMessage: 'Show details',
                })
          }
        >
          {isExpanded ? (
            <EuiText
              size="s"
              data-test-subj={`${dataTestSubjPrefix}ExportSourceWarningsList`}
              css={warningsListStyles}
            >
              <ul>
                {warnings?.map((warning, idx) => (
                  <li key={`${idx}-${warning}`}>{warning}</li>
                ))}
              </ul>
            </EuiText>
          ) : null}
        </EuiAccordion>
      </KbnWarningCallout>
    </EuiFlexItem>
  );
}

function LoadingState({ dataTestSubjPrefix }: { dataTestSubjPrefix: string }) {
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
          data-test-subj={`${dataTestSubjPrefix}ExportSourceLoading`}
          aria-label={i18n.translate('asCodeExport.exportJson.loadingLabel', {
            defaultMessage: 'Loading JSON source',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {i18n.translate('asCodeExport.exportJson.loadingText', {
            defaultMessage: 'Loading JSON source...',
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function SuccessState({
  jsonValue,
  openInConsole,
  dataTestSubjPrefix,
}: {
  jsonValue: string;
  openInConsole?: ExportJsonOpenInConsoleConfig;
  dataTestSubjPrefix: string;
}) {
  const useUrl = openInConsole?.useUrl;
  const openInConsoleRequest = openInConsole?.getRequest(jsonValue);
  const devToolsDataUri = openInConsoleRequest
    ? compressToEncodedURIComponent(openInConsoleRequest)
    : undefined;
  const consoleHref = useUrl?.(
    () => ({
      id: 'CONSOLE_APP_LOCATOR',
      params: {
        loadFrom: `data:text/plain,${devToolsDataUri}`,
      },
    }),
    [devToolsDataUri]
  );
  const canShowDevTools = Boolean(openInConsole?.canShow && devToolsDataUri !== undefined);

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
                    aria-label={i18n.translate('asCodeExport.exportJson.copyAriaLabel', {
                      defaultMessage: 'Copy JSON source',
                    })}
                    data-test-subj={`${dataTestSubjPrefix}ExportSourceCopyButton`}
                  >
                    {i18n.translate('asCodeExport.exportJson.copyButtonLabel', {
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
                  data-test-subj={`${dataTestSubjPrefix}ExportSourceOpenInConsoleButton`}
                >
                  {openInConsole?.label ??
                    i18n.translate('asCodeExport.exportJson.openInConsoleButtonLabel', {
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
          aria-label={i18n.translate('asCodeExport.exportJson.codeBlockAriaLabel', {
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

function ErrorState({
  error,
  onRetry,
  dataTestSubjPrefix,
}: {
  error: Error | undefined;
  onRetry?: () => void;
  dataTestSubjPrefix: string;
}) {
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
          data-test-subj={`${dataTestSubjPrefix}ExportSourceSanitizeErrorPrompt`}
          title={
            <h3>
              {i18n.translate('asCodeExport.exportJson.sanitizeErrorTitle', {
                defaultMessage: 'Unable to export',
              })}
            </h3>
          }
          body={
            <EuiText size="s">
              <p>
                {i18n.translate('asCodeExport.exportJson.sanitizeErrorBody', {
                  defaultMessage: 'Sorry, there was an error loading the JSON source.',
                })}
              </p>
              {error && (
                <p>
                  {i18n.translate('asCodeExport.exportJson.sanitizeErrorDetails', {
                    defaultMessage: 'Error: {errorMessage}',
                    values: { errorMessage: error.message },
                  })}
                </p>
              )}
            </EuiText>
          }
          actions={
            onRetry && (
              <EuiButton
                color="danger"
                iconType="refresh"
                onClick={onRetry}
                data-test-subj={`${dataTestSubjPrefix}ExportSourceRetryButton`}
              >
                {i18n.translate('asCodeExport.exportJson.retryButtonLabel', {
                  defaultMessage: 'Retry',
                })}
              </EuiButton>
            )
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const ExportJsonPanel = <State extends object, SanitizedState extends object>({
  status,
  data,
  warnings,
  error,
  onRetry,
  openInConsole,
  dataTestSubjPrefix,
}: ExportJsonPanelProps<SanitizedState>) => {
  const warningsAccordionId = useGeneratedHtmlId({
    prefix: `${dataTestSubjPrefix}ExportSourceWarnings`,
  });
  const [isWarningsExpanded, setIsWarningsExpanded] = useState(false);
  const [showWarningsCallout, setShowWarningsCallout] = useState(true);

  useEffect(() => {
    if (status !== 'loading') return;
    setIsWarningsExpanded(false);
    setShowWarningsCallout(true);
  }, [status]);

  const jsonValue = useMemo(
    () => (status === 'success' && data !== undefined ? JSON.stringify(data, null, 2) : undefined),
    [data, status]
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
          dataTestSubjPrefix={dataTestSubjPrefix}
          onDismiss={() => {
            setShowWarningsCallout(false);
            setIsWarningsExpanded(false);
          }}
        />

        <EuiFlexItem grow css={{ minHeight: 0 }}>
          {status === 'loading' ? (
            <LoadingState dataTestSubjPrefix={dataTestSubjPrefix} />
          ) : status === 'error' ? (
            <ErrorState error={error} onRetry={onRetry} dataTestSubjPrefix={dataTestSubjPrefix} />
          ) : jsonValue ? (
            <SuccessState
              jsonValue={jsonValue}
              openInConsole={openInConsole}
              dataTestSubjPrefix={dataTestSubjPrefix}
            />
          ) : (
            <ErrorState
              dataTestSubjPrefix={dataTestSubjPrefix}
              error={
                new Error(
                  i18n.translate('asCodeExport.exportJson.noDataError', {
                    defaultMessage: 'No data was returned. See warnings above for more details.',
                  })
                )
              }
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

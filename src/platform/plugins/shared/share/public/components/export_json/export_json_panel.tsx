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
import { css } from '@emotion/react';
import { CodeEditor, XJsonLang } from '@kbn/code-editor';
import { i18n } from '@kbn/i18n';
import type { ExportJsonSanitizedState, RenderExportJsonActions } from './types';

export type ExportJsonPanelProps<SanitizedState extends object> =
  ExportJsonSanitizedState<SanitizedState> & {
    onRetry: () => void;
    renderAdditionalActions?: RenderExportJsonActions;
  };

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
        title={i18n.translate('share.exportJson.warningsTitle', {
          defaultMessage: 'Unsupported properties were removed',
          description:
            'Title of a warning shown above the exported JSON, when parts of the object could not be represented in the export format and were dropped.',
        })}
        size="s"
        data-test-subj="exportJsonWarnings"
        onDismiss={onDismiss}
      >
        <EuiText size="s" color="subdued">
          {i18n.translate('share.exportJson.warningsSummary', {
            defaultMessage:
              '{count} item{count, plural, one {} other {s}} removed from the JSON source.',
            description:
              'Summary line under the warning title. {count} is how many properties were dropped from the exported JSON.',
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
              ? i18n.translate('share.exportJson.warningsAccordionHide', {
                  defaultMessage: 'Hide details',
                  description:
                    'Collapses the list of properties that were dropped from the exported JSON.',
                })
              : i18n.translate('share.exportJson.warningsAccordionShow', {
                  defaultMessage: 'Show details',
                  description:
                    'Expands the list of properties that were dropped from the exported JSON.',
                })
          }
        >
          {isExpanded ? (
            <EuiText size="s" data-test-subj="exportJsonWarningsList" css={warningsListStyles}>
              <ul>
                {warnings?.map((warning, idx) => (
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
          data-test-subj="exportJsonLoading"
          aria-label={i18n.translate('share.exportJson.loadingLabel', {
            defaultMessage: 'Loading JSON source',
            description: 'Screen reader label for the spinner shown while the export JSON loads.',
          })}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          {i18n.translate('share.exportJson.loadingText', {
            defaultMessage: 'Loading JSON source...',
            description: 'Text shown next to the spinner while the export JSON loads.',
          })}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

function SuccessState({
  jsonValue,
  renderAdditionalActions,
}: {
  jsonValue: string;
  renderAdditionalActions?: RenderExportJsonActions;
}) {
  const additionalActions = renderAdditionalActions?.(jsonValue);

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
      data-test-subj="exportJsonValue"
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
                    aria-label={i18n.translate('share.exportJson.copyAriaLabel', {
                      defaultMessage: 'Copy JSON source',
                      description:
                        'Screen reader label for the button that copies the exported JSON to the clipboard.',
                    })}
                    data-test-subj="exportJsonCopyButton"
                  >
                    {i18n.translate('share.exportJson.copyButtonLabel', {
                      defaultMessage: 'Copy to clipboard',
                      description:
                        'Button that copies the exported JSON, shown above the read-only JSON editor.',
                    })}
                  </EuiButtonEmpty>
                )}
              </EuiCopy>
            </div>
          </EuiFlexItem>
          {additionalActions ? (
            <EuiFlexItem grow={false}>
              <div>{additionalActions}</div>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={true}>
        <CodeEditor
          languageId={XJsonLang.ID}
          value={jsonValue}
          aria-label={i18n.translate('share.exportJson.codeBlockAriaLabel', {
            defaultMessage: 'Export JSON source',
            description: 'Screen reader label for the read-only editor showing the exported JSON.',
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

function ErrorState({ error, onRetry }: { error: Error | undefined; onRetry?: () => void }) {
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
          data-test-subj="exportJsonErrorPrompt"
          title={
            <h3>
              {i18n.translate('share.exportJson.sanitizeErrorTitle', {
                defaultMessage: 'Unable to export',
                description: 'Title shown in place of the JSON when the export could not be loaded.',
              })}
            </h3>
          }
          body={
            <EuiText size="s">
              <p>
                {i18n.translate('share.exportJson.sanitizeErrorBody', {
                  defaultMessage: 'Sorry, there was an error loading the JSON source.',
                  description: 'Body text shown when the export JSON could not be loaded.',
                })}
              </p>
              {error && (
                <p>
                  {i18n.translate('share.exportJson.sanitizeErrorDetails', {
                    defaultMessage: 'Error: {errorMessage}',
                    description:
                      'Shows the underlying failure. {errorMessage} is an untranslated technical message from the server.',
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
                data-test-subj="exportJsonRetryButton"
              >
                {i18n.translate('share.exportJson.retryButtonLabel', {
                  defaultMessage: 'Retry',
                  description: 'Button that loads the export JSON again after a failure.',
                })}
              </EuiButton>
            )
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export const ExportJsonPanel = <SanitizedState extends object>({
  status,
  data,
  warnings,
  error,
  onRetry,
  renderAdditionalActions,
}: ExportJsonPanelProps<SanitizedState>) => {
  const warningsAccordionId = useGeneratedHtmlId({ prefix: 'exportJsonWarnings' });
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
          onDismiss={() => {
            setShowWarningsCallout(false);
            setIsWarningsExpanded(false);
          }}
        />

        <EuiFlexItem grow css={{ minHeight: 0 }}>
          {status === 'loading' ? (
            <LoadingState />
          ) : status === 'error' ? (
            <ErrorState error={error} onRetry={onRetry} />
          ) : jsonValue ? (
            <SuccessState jsonValue={jsonValue} renderAdditionalActions={renderAdditionalActions} />
          ) : (
            <ErrorState
              error={
                new Error(
                  i18n.translate('share.exportJson.noDataError', {
                    defaultMessage: 'No data was returned. See warnings above for more details.',
                    description:
                      'Shown when the export succeeded but produced nothing, usually because every property was unsupported and dropped.',
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

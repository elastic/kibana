/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { memo, useState, useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiCode,
  EuiButtonIcon,
  EuiButtonEmpty,
} from '@elastic/eui';
import { Interpolation, Theme, css } from '@emotion/react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  LanguageDocumentationInline,
  LanguageDocumentationFlyout,
} from '@kbn/language-documentation';
import { getLimitFromESQLQuery } from '@kbn/esql-utils';
import { type MonacoMessage } from '../helpers';
import { ErrorsWarningsFooterPopover } from './errors_warnings_popover';
import { QueryHistoryAction, HistoryAndStarredQueriesTabs } from './history_starred_queries';
import { SubmitFeedbackComponent } from './feedback_component';
import { QueryWrapComponent } from './query_wrap_component';
import type { ESQLEditorDeps } from '../types';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;
const COMMAND_KEY = isMac ? '⌘' : '^';

interface EditorFooterProps {
  lines: number;
  styles: {
    bottomContainer: Interpolation<Theme>;
    historyContainer: Interpolation<Theme>;
  };
  code: string;
  errors?: MonacoMessage[];
  warnings?: MonacoMessage[];
  detectedTimestamp?: string;
  onErrorClick: (error: MonacoMessage) => void;
  runQuery: () => void;
  updateQuery: (qs: string) => void;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (status: boolean) => void;
  isLanguageComponentOpen: boolean;
  setIsLanguageComponentOpen: (status: boolean) => void;
  measuredContainerWidth: number;
  resizableContainerButton?: JSX.Element;
  resizableContainerHeight: number;
  hideRunQueryText?: boolean;
  editorIsInline?: boolean;
  isSpaceReduced?: boolean;
  hideTimeFilterInfo?: boolean;
  hideQueryHistory?: boolean;
  displayDocumentationAsFlyout?: boolean;
}

export const EditorFooter = memo(function EditorFooter({
  lines,
  styles,
  errors,
  warnings,
  detectedTimestamp,
  onErrorClick,
  runQuery,
  updateQuery,
  hideRunQueryText,
  editorIsInline,
  isSpaceReduced,
  hideTimeFilterInfo,
  resizableContainerButton,
  resizableContainerHeight,
  isHistoryOpen,
  setIsHistoryOpen,
  isLanguageComponentOpen,
  setIsLanguageComponentOpen,
  hideQueryHistory,
  displayDocumentationAsFlyout,
  measuredContainerWidth,
  code,
}: EditorFooterProps) {
  const kibana = useKibana<ESQLEditorDeps>();
  const { docLinks } = kibana.services;
  const [isErrorPopoverOpen, setIsErrorPopoverOpen] = useState(false);
  const [isWarningPopoverOpen, setIsWarningPopoverOpen] = useState(false);

  const onUpdateAndSubmit = useCallback(
    (qs: string) => {
      // update the query first
      updateQuery(qs);
      // submit the query with some latency
      // if I do it immediately there is some race condition until
      // the state is updated and it won't be sumbitted correctly
      setTimeout(() => {
        runQuery();
      }, 300);
    },
    [runQuery, updateQuery]
  );

  const toggleHistoryComponent = useCallback(() => {
    setIsHistoryOpen(!isHistoryOpen);
    setIsLanguageComponentOpen(false);
  }, [isHistoryOpen, setIsHistoryOpen, setIsLanguageComponentOpen]);

  const toggleLanguageComponent = useCallback(async () => {
    setIsLanguageComponentOpen(!isLanguageComponentOpen);
    setIsHistoryOpen(false);
  }, [isLanguageComponentOpen, setIsHistoryOpen, setIsLanguageComponentOpen]);

  const limit = useMemo(() => getLimitFromESQLQuery(code), [code]);

  return (
    <EuiFlexGroup
      gutterSize="none"
      responsive={false}
      direction="column"
      css={css`
        width: 100%;
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="s"
          justifyContent="spaceBetween"
          data-test-subj="ESQLEditor-footer"
          css={styles.bottomContainer}
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              gutterSize="none"
              responsive={false}
              alignItems="center"
              css={css`
                gap: 12px;
              `}
            >
              <QueryWrapComponent code={code} updateQuery={updateQuery} />
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" data-test-subj="ESQLEditor-footer-lines">
                  <p>
                    {i18n.translate('esqlEditor.query.lineCount', {
                      defaultMessage: '{count} {count, plural, one {line} other {lines}}',
                      values: { count: lines },
                    })}
                  </p>
                </EuiText>
              </EuiFlexItem>
              {/* If there is no space and no @timestamp detected hide the information */}
              {(detectedTimestamp || !isSpaceReduced) && !hideTimeFilterInfo && (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued" data-test-subj="ESQLEditor-date-info">
                        <p>
                          {isSpaceReduced
                            ? '@timestamp'
                            : detectedTimestamp
                            ? i18n.translate('esqlEditor.query.timestampDetected', {
                                defaultMessage: '{detectedTimestamp} found',
                                values: { detectedTimestamp },
                              })
                            : i18n.translate('esqlEditor.query.timestampNotDetected', {
                                defaultMessage: '@timestamp not found',
                              })}
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiText size="xs" color="subdued" data-test-subj="ESQLEditor-limit-info">
                      <p>
                        {isSpaceReduced
                          ? i18n.translate('esqlEditor.query.limitInfoReduced', {
                              defaultMessage: 'LIMIT {limit}',
                              values: { limit },
                            })
                          : i18n.translate('esqlEditor.query.limitInfo', {
                              defaultMessage: 'LIMIT {limit} rows',
                              values: { limit },
                            })}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              {errors && errors.length > 0 && (
                <ErrorsWarningsFooterPopover
                  isPopoverOpen={isErrorPopoverOpen}
                  items={errors}
                  type="error"
                  setIsPopoverOpen={(isOpen) => {
                    if (isOpen) {
                      setIsWarningPopoverOpen(false);
                    }
                    setIsErrorPopoverOpen(isOpen);
                  }}
                  onErrorClick={onErrorClick}
                />
              )}
              {warnings && warnings.length > 0 && (
                <ErrorsWarningsFooterPopover
                  isPopoverOpen={isWarningPopoverOpen}
                  items={warnings}
                  type="warning"
                  setIsPopoverOpen={(isOpen) => {
                    if (isOpen) {
                      setIsErrorPopoverOpen(false);
                    }
                    setIsWarningPopoverOpen(isOpen);
                  }}
                  onErrorClick={onErrorClick}
                />
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
              {!Boolean(editorIsInline) && (
                <>
                  <SubmitFeedbackComponent />
                  {!hideQueryHistory && (
                    <QueryHistoryAction
                      toggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
                      isHistoryOpen={isHistoryOpen}
                    />
                  )}
                </>
              )}
              {!hideRunQueryText && (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiText size="xs" color="subdued" data-test-subj="ESQLEditor-run-query">
                        <p>
                          {i18n.translate('esqlEditor.query.runQuery', {
                            defaultMessage: 'Run query',
                          })}
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiCode
                        transparentBackground
                        css={css`
                          font-size: 12px;
                        `}
                      >{`${COMMAND_KEY} + Enter`}</EuiCode>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
              {displayDocumentationAsFlyout && !Boolean(editorIsInline) && (
                <>
                  <EuiButtonEmpty
                    iconType="documentation"
                    color="text"
                    data-test-subj="ESQLEditor-documentation"
                    size="m"
                    onClick={() => toggleLanguageComponent()}
                    css={css`
                      cursor: pointer;
                    `}
                  />
                  <LanguageDocumentationFlyout
                    searchInDescription
                    linkToDocumentation={docLinks?.links?.query?.queryESQL ?? ''}
                    isHelpMenuOpen={isLanguageComponentOpen}
                    onHelpMenuVisibilityChange={setIsLanguageComponentOpen}
                  />
                </>
              )}
            </EuiFlexGroup>
          </EuiFlexItem>
          {Boolean(editorIsInline) && (
            <>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
                  <SubmitFeedbackComponent isSpaceReduced={true} />
                  {!hideQueryHistory && (
                    <QueryHistoryAction
                      toggleHistory={toggleHistoryComponent}
                      isHistoryOpen={isHistoryOpen}
                      isSpaceReduced={true}
                    />
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiButtonIcon
                      iconType="documentation"
                      onClick={toggleLanguageComponent}
                      aria-label={i18n.translate('esqlEditor.query.documentationAriaLabel', {
                        defaultMessage: 'Open documentation',
                      })}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {isHistoryOpen && (
        <EuiFlexItem grow={false}>
          <HistoryAndStarredQueriesTabs
            containerCSS={styles.historyContainer}
            onUpdateAndSubmit={onUpdateAndSubmit}
            containerWidth={measuredContainerWidth}
            height={resizableContainerHeight}
          />
        </EuiFlexItem>
      )}
      {isLanguageComponentOpen && editorIsInline && (
        <EuiFlexItem grow={false}>
          <LanguageDocumentationInline searchInDescription height={resizableContainerHeight} />
        </EuiFlexItem>
      )}
      {resizableContainerButton}
    </EuiFlexGroup>
  );
});

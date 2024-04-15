/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useState, useCallback } from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  useEuiTheme,
  EuiLink,
  EuiCode,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { Interpolation, Theme, css } from '@emotion/react';
import type { MonacoMessage } from './helpers';
import { ErrorsWarningsFooterPopover } from './errors_warnings_popover';
import { QueryHistoryAction, QueryHistory } from './query_history';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;
const COMMAND_KEY = isMac ? '⌘' : '^';
const FEEDBACK_LINK = 'https://ela.st/esql-feedback';

export function SubmitFeedbackComponent({ isSpaceReduced }: { isSpaceReduced?: boolean }) {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      {isSpaceReduced && (
        <EuiFlexItem grow={false}>
          <EuiLink
            href={FEEDBACK_LINK}
            external={false}
            target="_blank"
            data-test-subj="TextBasedLangEditor-feedback-link"
          >
            <EuiToolTip
              position="top"
              content={i18n.translate(
                'textBasedEditor.query.textBasedLanguagesEditor.submitFeedback',
                {
                  defaultMessage: 'Submit feedback',
                }
              )}
            >
              <EuiIcon
                type="editorComment"
                color="primary"
                size="m"
                css={css`
                  margin-right: ${euiTheme.size.s};
                `}
              />
            </EuiToolTip>
          </EuiLink>
        </EuiFlexItem>
      )}
      {!isSpaceReduced && (
        <>
          <EuiFlexItem grow={false}>
            <EuiIcon type="editorComment" color="primary" size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiLink
              href={FEEDBACK_LINK}
              external={false}
              target="_blank"
              css={css`
                font-size: 12px;
                margin-right: ${euiTheme.size.m};
              `}
              data-test-subj="TextBasedLangEditor-feedback-link"
            >
              {isSpaceReduced
                ? i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.feedback', {
                    defaultMessage: 'Feedback',
                  })
                : i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.submitFeedback', {
                    defaultMessage: 'Submit feedback',
                  })}
            </EuiLink>
          </EuiFlexItem>
        </>
      )}
    </>
  );
}

interface EditorFooterProps {
  lines: number;
  styles: {
    bottomContainer: Interpolation<Theme>;
    historyContainer: Interpolation<Theme>;
  };
  errors?: MonacoMessage[];
  warnings?: MonacoMessage[];
  detectTimestamp: boolean;
  onErrorClick: (error: MonacoMessage) => void;
  runQuery: () => void;
  updateQuery: (qs: string) => void;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (status: boolean) => void;
  containerWidth: number;
  hideRunQueryText?: boolean;
  disableSubmitAction?: boolean;
  editorIsInline?: boolean;
  isSpaceReduced?: boolean;
  isLoading?: boolean;
  allowQueryCancellation?: boolean;
  hideTimeFilterInfo?: boolean;
  hideQueryHistory?: boolean;
  refetchHistoryItems?: boolean;
  isInCompactMode?: boolean;
}

export const EditorFooter = memo(function EditorFooter({
  lines,
  styles,
  errors,
  warnings,
  detectTimestamp,
  onErrorClick,
  runQuery,
  updateQuery,
  hideRunQueryText,
  disableSubmitAction,
  editorIsInline,
  isSpaceReduced,
  isLoading,
  allowQueryCancellation,
  hideTimeFilterInfo,
  isHistoryOpen,
  containerWidth,
  setIsHistoryOpen,
  hideQueryHistory,
  refetchHistoryItems,
  isInCompactMode,
}: EditorFooterProps) {
  const { euiTheme } = useEuiTheme();
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

  const shadowStyle = isInCompactMode
    ? `inset 0 0px 0, inset 0 -1px 0 ${euiTheme.border.color}`
    : 'none';

  return (
    <EuiFlexGroup
      gutterSize="none"
      responsive={false}
      direction="column"
      css={css`
        width: ${containerWidth}px;
        box-shadow: ${shadowStyle};
      `}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          gutterSize="s"
          justifyContent="spaceBetween"
          data-test-subj="TextBasedLangEditor-footer"
          css={styles.bottomContainer}
          responsive={false}
        >
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
              <EuiFlexItem grow={false} style={{ marginRight: '8px' }}>
                <EuiText
                  size="xs"
                  color="subdued"
                  data-test-subj="TextBasedLangEditor-footer-lines"
                >
                  <p>
                    {i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.lineCount', {
                      defaultMessage: '{count} {count, plural, one {line} other {lines}}',
                      values: { count: lines },
                    })}
                  </p>
                </EuiText>
              </EuiFlexItem>
              {/* If there is no space and no @timestamp detected hide the information */}
              {(detectTimestamp || !isSpaceReduced) && !hideTimeFilterInfo && (
                <EuiFlexItem grow={false} style={{ marginRight: '16px' }}>
                  <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiText
                        size="xs"
                        color="subdued"
                        data-test-subj="TextBasedLangEditor-date-info"
                      >
                        <p>
                          {isSpaceReduced
                            ? '@timestamp'
                            : detectTimestamp
                            ? i18n.translate(
                                'textBasedEditor.query.textBasedLanguagesEditor.timestampDetected',
                                {
                                  defaultMessage: '@timestamp found',
                                }
                              )
                            : i18n.translate(
                                'textBasedEditor.query.textBasedLanguagesEditor.timestampNotDetected',
                                {
                                  defaultMessage: '@timestamp not found',
                                }
                              )}
                        </p>
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
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
                      <EuiText
                        size="xs"
                        color="subdued"
                        data-test-subj="TextBasedLangEditor-run-query"
                      >
                        <p>
                          {i18n.translate(
                            'textBasedEditor.query.textBasedLanguagesEditor.runQuery',
                            {
                              defaultMessage: 'Run query',
                            }
                          )}
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
            </EuiFlexGroup>
          </EuiFlexItem>
          {Boolean(editorIsInline) && (
            <>
              <EuiFlexItem grow={false}>
                <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
                  <SubmitFeedbackComponent isSpaceReduced={true} />
                  {!hideQueryHistory && (
                    <QueryHistoryAction
                      toggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
                      isHistoryOpen={isHistoryOpen}
                      isSpaceReduced={true}
                    />
                  )}
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      position="top"
                      content={i18n.translate(
                        'textBasedEditor.query.textBasedLanguagesEditor.runQuery',
                        {
                          defaultMessage: 'Run query',
                        }
                      )}
                    >
                      <EuiButtonIcon
                        display="base"
                        color="primary"
                        onClick={runQuery}
                        iconType={allowQueryCancellation && isLoading ? 'cross' : 'refresh'}
                        size="s"
                        isLoading={isLoading && !allowQueryCancellation}
                        isDisabled={Boolean(disableSubmitAction && !allowQueryCancellation)}
                        data-test-subj="TextBasedLangEditor-run-query-button"
                        aria-label={
                          allowQueryCancellation && isLoading
                            ? i18n.translate(
                                'textBasedEditor.query.textBasedLanguagesEditor.cancel',
                                {
                                  defaultMessage: 'Cancel',
                                }
                              )
                            : i18n.translate(
                                'textBasedEditor.query.textBasedLanguagesEditor.runQuery',
                                {
                                  defaultMessage: 'Run query',
                                }
                              )
                        }
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {isHistoryOpen && (
        <EuiFlexItem grow={false}>
          <QueryHistory
            containerCSS={styles.historyContainer}
            onUpdateAndSubmit={onUpdateAndSubmit}
            containerWidth={containerWidth}
            refetchHistoryItems={refetchHistoryItems}
            isInCompactMode={isInCompactMode}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});

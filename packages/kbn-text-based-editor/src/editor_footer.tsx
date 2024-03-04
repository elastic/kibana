/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useState } from 'react';

import { i18n } from '@kbn/i18n';
import {
  EuiCode,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiButton,
  useEuiTheme,
  EuiLink,
} from '@elastic/eui';
import { Interpolation, Theme, css } from '@emotion/react';
import type { MonacoMessage } from './helpers';
import { ErrorsWarningsFooterPopover } from './errors_warnings_popover';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;
const COMMAND_KEY = isMac ? '⌘' : '^';
const FEEDBACK_LINK = 'https://ela.st/esql-feedback';

export function SubmitFeedbackComponent({ isSpaceReduced }: { isSpaceReduced?: boolean }) {
  const { euiTheme } = useEuiTheme();
  return (
    <>
      <EuiFlexItem grow={false}>
        <EuiIcon type="discuss" color="primary" size="s" />
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
  );
}

interface EditorFooterProps {
  lines: number;
  containerCSS: Interpolation<Theme>;
  errors?: MonacoMessage[];
  warnings?: MonacoMessage[];
  detectTimestamp: boolean;
  onErrorClick: (error: MonacoMessage) => void;
  runQuery: () => void;
  hideRunQueryText?: boolean;
  disableSubmitAction?: boolean;
  editorIsInline?: boolean;
  isSpaceReduced?: boolean;
  isLoading?: boolean;
  allowQueryCancellation?: boolean;
  hideTimeFilterInfo?: boolean;
}

export const EditorFooter = memo(function EditorFooter({
  lines,
  containerCSS,
  errors,
  warnings,
  detectTimestamp,
  onErrorClick,
  runQuery,
  hideRunQueryText,
  disableSubmitAction,
  editorIsInline,
  isSpaceReduced,
  isLoading,
  allowQueryCancellation,
  hideTimeFilterInfo,
}: EditorFooterProps) {
  const { euiTheme } = useEuiTheme();
  const [isErrorPopoverOpen, setIsErrorPopoverOpen] = useState(false);
  const [isWarningPopoverOpen, setIsWarningPopoverOpen] = useState(false);
  return (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="spaceBetween"
      data-test-subj="TextBasedLangEditor-footer"
      css={containerCSS}
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
          <EuiFlexItem grow={false} style={{ marginRight: '8px' }}>
            <EuiText size="xs" color="subdued" data-test-subj="TextBasedLangEditor-footer-lines">
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
                  <EuiText size="xs" color="subdued" data-test-subj="TextBasedLangEditor-date-info">
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
      {!hideRunQueryText && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
            <SubmitFeedbackComponent />
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued" data-test-subj="TextBasedLangEditor-run-query">
                <p>
                  {i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.runQuery', {
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
      {Boolean(editorIsInline) && (
        <>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup responsive={false} gutterSize="xs" alignItems="center">
              <SubmitFeedbackComponent isSpaceReduced={isSpaceReduced} />
              <EuiFlexItem grow={false}>
                <EuiButton
                  color="text"
                  size="s"
                  fill
                  onClick={runQuery}
                  isLoading={isLoading && !allowQueryCancellation}
                  isDisabled={Boolean(disableSubmitAction && !allowQueryCancellation)}
                  data-test-subj="TextBasedLangEditor-run-query-button"
                  minWidth={isSpaceReduced ? false : undefined}
                >
                  <EuiFlexGroup
                    gutterSize="xs"
                    responsive={false}
                    alignItems="center"
                    justifyContent="spaceBetween"
                  >
                    <EuiFlexItem grow={false}>
                      {allowQueryCancellation && isLoading
                        ? i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.cancel', {
                            defaultMessage: 'Cancel',
                          })
                        : isSpaceReduced
                        ? i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.run', {
                            defaultMessage: 'Run',
                          })
                        : i18n.translate(
                            'textBasedEditor.query.textBasedLanguagesEditor.runQuery',
                            {
                              defaultMessage: 'Run query',
                            }
                          )}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiText
                        size="xs"
                        css={css`
                          border: 1px solid
                            ${Boolean(disableSubmitAction && !allowQueryCancellation)
                              ? euiTheme.colors.disabled
                              : euiTheme.colors.emptyShade};
                          padding: 0 ${euiTheme.size.xs};
                          font-size: ${euiTheme.size.s};
                          margin-left: ${euiTheme.size.xs};
                          border-radius: ${euiTheme.size.xs};
                        `}
                      >
                        {allowQueryCancellation && isLoading ? 'X' : `${COMMAND_KEY}⏎`}
                      </EuiText>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </>
      )}
    </EuiFlexGroup>
  );
});

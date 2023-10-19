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
  EuiPopover,
  EuiPopoverTitle,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiButton,
  useEuiTheme,
} from '@elastic/eui';
import { Interpolation, Theme, css } from '@emotion/react';
import { css as classNameCss } from '@emotion/css';

import type { MonacoError } from './helpers';

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;
const COMMAND_KEY = isMac ? '⌘' : '^';

const getConstsByType = (type: 'error' | 'warning', count: number) => {
  if (type === 'error') {
    return {
      color: 'danger',
      message: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.errorCount', {
        defaultMessage: '{count} {count, plural, one {error} other {errors}}',
        values: { count },
      }),
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.errorsTitle', {
        defaultMessage: 'Errors',
      }),
    };
  } else {
    return {
      color: 'warning',
      message: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.warningCount', {
        defaultMessage: '{count} {count, plural, one {warning} other {warnings}}',
        values: { count },
      }),
      label: i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.warningsTitle', {
        defaultMessage: 'Warnings',
      }),
    };
  }
};

export function ErrorsWarningsPopover({
  isPopoverOpen,
  items,
  type,
  setIsPopoverOpen,
  onErrorClick,
  hasSmallerSpace,
}: {
  isPopoverOpen: boolean;
  items: MonacoError[];
  type: 'error' | 'warning';
  setIsPopoverOpen: (flag: boolean) => void;
  onErrorClick: (error: MonacoError) => void;
  hasSmallerSpace?: boolean;
}) {
  const strings = getConstsByType(type, items.length);
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type="error" color={strings.color} size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            button={
              <EuiText
                size="xs"
                color={strings.color}
                css={css`
                  &:hover {
                    cursor: pointer;
                    text-decoration: underline;
                  }
                `}
                onClick={() => {
                  setIsPopoverOpen(!isPopoverOpen);
                }}
              >
                <p>{hasSmallerSpace ? items.length : strings.message}</p>
              </EuiText>
            }
            ownFocus={false}
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
          >
            <div style={{ width: 500 }}>
              <EuiPopoverTitle paddingSize="s">{strings.label}</EuiPopoverTitle>
              <EuiDescriptionList>
                {items.map((item, index) => {
                  return (
                    <EuiDescriptionListDescription
                      key={index}
                      className={classNameCss`
                                &:hover {
                                  cursor: pointer;
                                }
                              `}
                      onClick={() => onErrorClick(item)}
                    >
                      <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
                        <EuiFlexItem grow={false}>
                          <EuiFlexGroup gutterSize="s" alignItems="center">
                            <EuiFlexItem grow={false}>
                              <EuiIcon type={type} color={strings.color} size="s" />
                            </EuiFlexItem>
                            <EuiFlexItem style={{ whiteSpace: 'nowrap' }}>
                              {i18n.translate(
                                'textBasedEditor.query.textBasedLanguagesEditor.lineNumber',
                                {
                                  defaultMessage: 'Line {lineNumber}',
                                  values: { lineNumber: item.startLineNumber },
                                }
                              )}
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem grow={false} className="TextBasedLangEditor_errorMessage">
                          {item.message}
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiDescriptionListDescription>
                  );
                })}
              </EuiDescriptionList>
            </div>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

interface EditorFooterProps {
  lines: number;
  containerCSS: Interpolation<Theme>;
  errors?: MonacoError[];
  warning?: MonacoError[];
  detectTimestamp: boolean;
  onErrorClick: (error: MonacoError) => void;
  runQuery: () => void;
  hideRunQueryText?: boolean;
  disableSubmitAction?: boolean;
  editorIsInline?: boolean;
  hasSmallerSpace?: boolean;
}

export const EditorFooter = memo(function EditorFooter({
  lines,
  containerCSS,
  errors,
  warning,
  detectTimestamp,
  onErrorClick,
  runQuery,
  hideRunQueryText,
  disableSubmitAction,
  editorIsInline,
  hasSmallerSpace,
}: EditorFooterProps) {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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
          <EuiFlexItem grow={false} style={{ marginRight: '16px' }}>
            <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
              <EuiFlexItem grow={false}>
                <EuiIcon type={detectTimestamp ? 'check' : 'cross'} color="subdued" size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" data-test-subj="TextBasedLangEditor-date-info">
                  <p>
                    {hasSmallerSpace
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
          {errors && errors.length > 0 && (
            <ErrorsWarningsPopover
              isPopoverOpen={isPopoverOpen}
              items={errors}
              type="error"
              setIsPopoverOpen={setIsPopoverOpen}
              onErrorClick={onErrorClick}
              hasSmallerSpace={hasSmallerSpace}
            />
          )}
          {warning && warning.length > 0 && (
            <ErrorsWarningsPopover
              isPopoverOpen={isPopoverOpen}
              items={warning}
              type="warning"
              setIsPopoverOpen={setIsPopoverOpen}
              onErrorClick={onErrorClick}
              hasSmallerSpace={hasSmallerSpace}
            />
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      {!hideRunQueryText && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
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
        <EuiFlexItem grow={false}>
          <EuiButton
            color="text"
            size="s"
            fill
            onClick={runQuery}
            isDisabled={Boolean(disableSubmitAction)}
            data-test-subj="TextBasedLangEditor-run-query-button"
          >
            <EuiFlexGroup
              gutterSize="xs"
              responsive={false}
              alignItems="center"
              justifyContent="spaceBetween"
            >
              <EuiFlexItem grow={false}>
                {hasSmallerSpace
                  ? i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.run', {
                      defaultMessage: 'Run',
                    })
                  : i18n.translate('textBasedEditor.query.textBasedLanguagesEditor.runQuery', {
                      defaultMessage: 'Run query',
                    })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText
                  size="xs"
                  css={css`
                    border: 1px solid
                      ${Boolean(disableSubmitAction)
                        ? euiTheme.colors.disabled
                        : euiTheme.colors.emptyShade};
                    padding: 0 ${euiTheme.size.xs};
                    font-size: ${euiTheme.size.s};
                    margin-left: ${euiTheme.size.xs};
                    border-radius: ${euiTheme.size.xs};
                  `}
                >
                  {COMMAND_KEY}⏎
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
});

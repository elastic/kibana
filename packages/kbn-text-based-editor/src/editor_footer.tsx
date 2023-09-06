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
  refreshErrors,
  setIsPopoverOpen,
  onErrorClick,
}: {
  isPopoverOpen: boolean;
  items: MonacoError[];
  type: 'error' | 'warning';
  refreshErrors: () => void;
  setIsPopoverOpen: (flag: boolean) => void;
  onErrorClick: (error: MonacoError) => void;
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
                  refreshErrors();
                  setIsPopoverOpen(!isPopoverOpen);
                }}
              >
                <p>{strings.message}</p>
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
  refreshErrors: () => void;
}

export const EditorFooter = memo(function EditorFooter({
  lines,
  containerCSS,
  errors,
  warning,
  detectTimestamp,
  onErrorClick,
  refreshErrors,
}: EditorFooterProps) {
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
          {errors && errors.length > 0 && (
            <ErrorsWarningsPopover
              isPopoverOpen={isPopoverOpen}
              items={errors}
              type="error"
              refreshErrors={refreshErrors}
              setIsPopoverOpen={setIsPopoverOpen}
              onErrorClick={onErrorClick}
            />
          )}
          {warning && warning.length > 0 && (
            <ErrorsWarningsPopover
              isPopoverOpen={isPopoverOpen}
              items={warning}
              type="warning"
              refreshErrors={refreshErrors}
              setIsPopoverOpen={setIsPopoverOpen}
              onErrorClick={onErrorClick}
            />
          )}
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
                <EuiIcon type="calendar" color="subdued" size="s" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="xs" color="subdued" data-test-subj="TextBasedLangEditor-date-info">
                  <p>
                    {detectTimestamp
                      ? i18n.translate(
                          'textBasedEditor.query.textBasedLanguagesEditor.timestampDetected',
                          {
                            defaultMessage: '@timestamp detected',
                          }
                        )
                      : i18n.translate(
                          'textBasedEditor.query.textBasedLanguagesEditor.timestampNotDetected',
                          {
                            defaultMessage: '@timestamp not detected',
                          }
                        )}
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiText size="xs" color="subdued">
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
    </EuiFlexGroup>
  );
});

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
  EuiBadge,
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

const isMac = navigator.platform.toLowerCase().indexOf('mac') >= 0;
const COMMAND_KEY = isMac ? '⌘' : '^';

interface EditorFooterProps {
  lines: number;
  containerCSS: Interpolation<Theme>;
  errors?: Array<{ startLineNumber: number; message: string }>;
}

export const EditorFooter = memo(function EditorFooter({
  lines,
  containerCSS,
  errors,
}: EditorFooterProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  return (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="spaceBetween"
      data-test-subj="unifiedTextLangEditor-footer"
      css={containerCSS}
      responsive={false}
    >
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued" data-test-subj="unifiedTextLangEditor-footer-lines">
              <p>
                {i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.lineCount', {
                  defaultMessage: '{count} {count, plural, one {line} other {lines}}',
                  values: { count: lines },
                })}
              </p>
            </EuiText>
          </EuiFlexItem>
          {errors && errors.length > 0 && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiIcon type="crossInACircleFilled" color="danger" size="s" />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiPopover
                    button={
                      <EuiText
                        size="s"
                        color="danger"
                        css={css`
                          &:hover {
                            cursor: pointer;
                            text-decoration: underline;
                          }
                        `}
                        onClick={() => setIsPopoverOpen(true)}
                      >
                        <p>
                          {i18n.translate(
                            'unifiedSearch.query.textBasedLanguagesEditor.errorCount',
                            {
                              defaultMessage: '{count} {count, plural, one {error} other {errors}}',
                              values: { count: errors.length },
                            }
                          )}
                        </p>
                      </EuiText>
                    }
                    ownFocus={false}
                    isOpen={isPopoverOpen}
                    closePopover={() => setIsPopoverOpen(false)}
                  >
                    <div style={{ width: 500 }}>
                      <EuiPopoverTitle paddingSize="s">
                        {i18n.translate(
                          'unifiedSearch.query.textBasedLanguagesEditor.errorsTitle',
                          {
                            defaultMessage: 'Errors',
                          }
                        )}
                      </EuiPopoverTitle>
                      <EuiDescriptionList>
                        {errors.map((error, index) => {
                          return (
                            <EuiDescriptionListDescription key={index}>
                              <EuiFlexGroup gutterSize="s" alignItems="center" wrap>
                                <EuiFlexItem grow={false}>
                                  <EuiIcon type="crossInACircleFilled" color="danger" size="s" />
                                </EuiFlexItem>
                                <EuiFlexItem>
                                  {i18n.translate(
                                    'unifiedSearch.query.textBasedLanguagesEditor.lineNumber',
                                    {
                                      defaultMessage: 'Line {lineNumber}',
                                      values: { lineNumber: error.startLineNumber },
                                    }
                                  )}
                                </EuiFlexItem>
                                <EuiFlexItem grow={false}>{error.message}</EuiFlexItem>
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
          )}
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="xs" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('unifiedSearch.query.textBasedLanguagesEditor.runQuery', {
                  defaultMessage: 'Run query',
                })}
              </p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="default">{`${COMMAND_KEY} + Enter`} </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});

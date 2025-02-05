/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  euiTextBreakWord,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { css as classNameCss } from '@emotion/css';
import type { MonacoMessage } from '../helpers';

const getConstsByType = (type: 'error' | 'warning', count: number) => {
  if (type === 'error') {
    return {
      color: 'danger',
      message: i18n.translate('esqlEditor.query.errorCount', {
        defaultMessage: '{count} {count, plural, one {error} other {errors}}',
        values: { count },
      }),
      label: i18n.translate('esqlEditor.query.errorsTitle', {
        defaultMessage: 'Errors',
      }),
    };
  } else {
    return {
      color: 'warning',
      message: i18n.translate('esqlEditor.query.warningCount', {
        defaultMessage: '{count} {count, plural, one {warning} other {warnings}}',
        values: { count },
      }),
      label: i18n.translate('esqlEditor.query.warningsTitle', {
        defaultMessage: 'Warnings',
      }),
    };
  }
};

function ErrorsWarningsContent({
  items,
  type,
  onErrorClick,
}: {
  items: MonacoMessage[];
  type: 'error' | 'warning';
  onErrorClick: (error: MonacoMessage) => void;
}) {
  const { color } = getConstsByType(type, items.length);
  return (
    <div style={{ width: 500 }}>
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
                      <EuiIcon type={type} color={color} size="s" />
                    </EuiFlexItem>
                    <EuiFlexItem style={{ whiteSpace: 'nowrap' }}>
                      {i18n.translate('esqlEditor.query.lineNumber', {
                        defaultMessage: 'Line {lineNumber}',
                        values: { lineNumber: item.startLineNumber },
                      })}
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiFlexItem>
                <EuiFlexItem
                  grow={false}
                  css={css`
                    ${euiTextBreakWord()}
                  `}
                >
                  {item.message}
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiDescriptionListDescription>
          );
        })}
      </EuiDescriptionList>
    </div>
  );
}

export function ErrorsWarningsFooterPopover({
  isPopoverOpen,
  items,
  type,
  setIsPopoverOpen,
  onErrorClick,
  isSpaceReduced,
}: {
  isPopoverOpen: boolean;
  items: MonacoMessage[];
  type: 'error' | 'warning';
  setIsPopoverOpen: (flag: boolean) => void;
  onErrorClick: (error: MonacoMessage) => void;
  isSpaceReduced?: boolean;
}) {
  const { color, message } = getConstsByType(type, items.length);
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon
            type={type}
            color={color}
            size="s"
            onClick={() => {
              setIsPopoverOpen(!isPopoverOpen);
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            anchorPosition="downLeft"
            hasArrow={false}
            panelPaddingSize="s"
            button={
              <EuiText
                size="xs"
                color={color}
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
                <p>{isSpaceReduced ? items.length : message}</p>
              </EuiText>
            }
            ownFocus={false}
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
          >
            <ErrorsWarningsContent items={items} type={type} onErrorClick={onErrorClick} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

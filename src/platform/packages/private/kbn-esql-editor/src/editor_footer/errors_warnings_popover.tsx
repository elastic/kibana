/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  euiTextBreakWord,
  useEuiTheme,
} from '@elastic/eui';
import { css as classNameCss } from '@emotion/css';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useCallback, useMemo } from 'react';
import type { MonacoMessage } from '@kbn/monaco/src/languages/esql/language';
import { filterDataErrors } from '../helpers';
import type { DataErrorsControl } from '../types';
import { DataErrorsSwitch } from './data_errors_switch';

interface TypeConsts {
  color: 'danger' | 'warning' | 'text';
  message: string;
  label: string;
}
const getConstsByType = (type: 'error' | 'warning', count: number): TypeConsts => {
  if (type === 'error') {
    return {
      color: count > 0 ? 'danger' : 'text',
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
  onQuickFixClick,
}: {
  items: MonacoMessage[];
  type: 'error' | 'warning';
  onErrorClick: (error: MonacoMessage) => void;
  onQuickFixClick: (error: MonacoMessage) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const { color } = getConstsByType(type, items.length);

  const handleClick = (item: MonacoMessage) => {
    const selection = window.getSelection();
    const selectedText = selection?.toString();

    // If user has selected text, don't treat it as a normal click
    if (selectedText && selectedText.length > 0) {
      return;
    }

    onErrorClick(item);
  };

  return (
    <div style={{ width: 500, padding: euiTheme.size.s, maxHeight: 300, overflow: 'auto' }}>
      <EuiDescriptionList data-test-subj="ESQLEditor-errors-warnings-content">
        {items.map((item, index) => {
          return (
            <EuiDescriptionListDescription
              key={index}
              className={classNameCss`
                &:hover {
                  cursor: pointer;
                }
                white-space: pre-line;
                user-select: text;
              `}
              onClick={() => handleClick(item)}
            >
              <div
                css={css`
                  display: grid;
                  grid-template-columns: auto 1fr;
                  column-gap: ${euiTheme.size.xl};
                  row-gap: ${euiTheme.size.s};
                  align-items: start;
                `}
              >
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiIcon type={type} color={color} size="s" aria-hidden={true} />
                  </EuiFlexItem>
                  <EuiFlexItem css={{ whiteSpace: 'nowrap' }}>
                    {i18n.translate('esqlEditor.query.lineNumber', {
                      defaultMessage: 'Line {lineNumber}',
                      values: { lineNumber: item.startLineNumber },
                    })}
                  </EuiFlexItem>
                </EuiFlexGroup>
                <div
                  css={css`
                    ${euiTextBreakWord()}
                  `}
                >
                  {item.message}
                </div>
                {item.quickFix ? (
                  <EuiButtonEmpty
                    size="xs"
                    color="text"
                    iconType="wrench"
                    iconSize="s"
                    data-test-subj="ESQLEditor-errors-warnings-content-quick-fix"
                    aria-label={i18n.translate('esqlEditor.query.quickFix.ariaLabel', {
                      defaultMessage: 'Quick fix: {title}',
                      values: { title: item.quickFix.title },
                    })}
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      onQuickFixClick(item);
                    }}
                  >
                    {item.quickFix.title}
                  </EuiButtonEmpty>
                ) : null}
              </div>
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
  onQuickFixClick,
  isSpaceReduced,
  dataErrorsControl,
}: {
  isPopoverOpen: boolean;
  items: MonacoMessage[];
  type: 'error' | 'warning';
  setIsPopoverOpen: (flag: boolean) => void;
  onErrorClick: (error: MonacoMessage) => void;
  onQuickFixClick: (error: MonacoMessage) => void;
  isSpaceReduced?: boolean;
  dataErrorsControl?: DataErrorsControl;
}) {
  // Visible items may be 0 if dataErrorsControl is enabled and there are only data errors.
  // In this case, we still want to show the popover with the switch, so the user can disable it to see the errors.
  const visibleItems = useMemo(() => {
    if (dataErrorsControl?.enabled === false) {
      return filterDataErrors(items);
    }
    return items;
  }, [items, dataErrorsControl]);

  const { color, message } = getConstsByType(type, visibleItems.length);
  const closePopover = useCallback(() => setIsPopoverOpen(false), [setIsPopoverOpen]);

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
        <EuiPopover
          anchorPosition="downLeft"
          hasArrow={false}
          panelPaddingSize="none"
          button={
            <EuiButtonEmpty
              iconType={type}
              iconSize="s"
              color={color}
              size="xs"
              iconSide="left"
              onClick={() => {
                setIsPopoverOpen(!isPopoverOpen);
              }}
              data-test-subj={`ESQLEditor-footerPopoverButton-${type}`}
            >
              {isSpaceReduced ? visibleItems.length : message}
            </EuiButtonEmpty>
          }
          ownFocus={false}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
          aria-label={i18n.translate('esqlEditor.errorsWarningsPopover.ariaLabel', {
            defaultMessage: 'Popover for {type}s',
            values: { type },
          })}
        >
          {visibleItems.length > 0 && (
            <ErrorsWarningsContent
              items={visibleItems}
              type={type}
              onErrorClick={onErrorClick}
              onQuickFixClick={onQuickFixClick}
            />
          )}
          {dataErrorsControl && (
            <DataErrorsSwitch dataErrorsControl={dataErrorsControl} closePopover={closePopover} />
          )}
        </EuiPopover>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

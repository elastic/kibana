/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiSwitch,
  EuiText,
  euiTextBreakWord,
  useEuiTheme,
} from '@elastic/eui';
import { css as classNameCss } from '@emotion/css';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback, useMemo } from 'react';
import type { MonacoMessage } from '@kbn/monaco/src/languages/esql/language';
import { filterDataErrors } from '../helpers';
import type { DataErrorsControl } from '../types';

const getColorByType = (
  type: 'error' | 'warning',
  count: number
): 'danger' | 'warning' | 'text' => {
  if (type === 'error') {
    return count > 0 ? 'danger' : 'text';
  } else {
    return 'warning';
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
  const { euiTheme } = useEuiTheme();
  const color = getColorByType(type, items.length);

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
              <EuiFlexGroup gutterSize="xl" alignItems="flexStart">
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="s" alignItems="center">
                    <EuiFlexItem grow={false}>
                      <EuiIcon type={type} color={color} size="s" />
                    </EuiFlexItem>
                    <EuiFlexItem css={{ whiteSpace: 'nowrap' }}>
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

function ErrorsWarningsFooter({
  dataErrorsControl,
  closePopover,
}: {
  dataErrorsControl: DataErrorsControl;
  closePopover: () => void;
}) {
  const { euiTheme } = useEuiTheme();
  const { onChange: onChangeDataErrors, enabled: dataErrorsEnabled } = dataErrorsControl;

  const onChangeDataErrorsSwitch = useCallback(() => {
    onChangeDataErrors(!dataErrorsEnabled);
    closePopover();
  }, [onChangeDataErrors, dataErrorsEnabled, closePopover]);

  return (
    <EuiFlexGroup
      alignItems="center"
      css={css`
        padding: ${euiTheme.size.s};
        background-color: ${euiTheme.colors.backgroundBaseSubdued};
      `}
    >
      <EuiFlexItem>
        <EuiSwitch
          compressed
          checked={dataErrorsEnabled}
          onChange={onChangeDataErrorsSwitch}
          label={
            <EuiText size="xs">
              <FormattedMessage
                id="esqlEditor.query.dataErrorsLabel"
                defaultMessage="Highlight data errors"
              />
            </EuiText>
          }
          data-test-subj="ESQLEditor-footerPopover-dataErrorsSwitch"
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

export function ErrorsWarningsFooterPopover({
  isPopoverOpen,
  items,
  type,
  setIsPopoverOpen,
  onErrorClick,
  dataErrorsControl,
}: {
  isPopoverOpen: boolean;
  items: MonacoMessage[];
  type: 'error' | 'warning';
  setIsPopoverOpen: (flag: boolean) => void;
  onErrorClick: (error: MonacoMessage) => void;
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

  const color = getColorByType(type, visibleItems.length);
  const closePopover = useCallback(() => setIsPopoverOpen(false), [setIsPopoverOpen]);

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" responsive={false} alignItems="center">
        <EuiPopover
          anchorPosition="downLeft"
          hasArrow={false}
          panelPaddingSize="none"
          button={
            <EuiButtonIcon
              iconType={type}
              iconSize="s"
              color={color}
              size="xs"
              onClick={() => {
                setIsPopoverOpen(!isPopoverOpen);
              }}
              data-test-subj={`ESQLEditor-footerPopoverButton-${type}`}
              aria-label={i18n.translate('esqlEditor.query.errorsWarningsPopoverButtonAriaLabel', {
                defaultMessage: 'Show {type} details',
                values: { type },
              })}
            />
          }
          ownFocus={false}
          isOpen={isPopoverOpen}
          closePopover={closePopover}
        >
          {visibleItems.length > 0 && (
            <ErrorsWarningsContent items={visibleItems} type={type} onErrorClick={onErrorClick} />
          )}
          {dataErrorsControl && (
            <ErrorsWarningsFooter
              dataErrorsControl={dataErrorsControl}
              closePopover={closePopover}
            />
          )}
        </EuiPopover>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
}

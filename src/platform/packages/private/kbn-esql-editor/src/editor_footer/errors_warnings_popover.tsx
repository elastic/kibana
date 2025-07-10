/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPopover,
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiButtonEmpty,
  euiTextBreakWord,
  EuiSwitch,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { css as classNameCss } from '@emotion/css';
import { FormattedMessage } from '@kbn/i18n-react';
import { filterDataErrors, type MonacoMessage } from '../helpers';
import { DataErrorsControl } from '../types';

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
}: {
  items: MonacoMessage[];
  type: 'error' | 'warning';
  onErrorClick: (error: MonacoMessage) => void;
}) {
  const { euiTheme } = useEuiTheme();
  const { color } = getConstsByType(type, items.length);
  return (
    <div style={{ width: 500, padding: euiTheme.size.s }}>
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
  isSpaceReduced,
  dataErrorsControl,
}: {
  isPopoverOpen: boolean;
  items: MonacoMessage[];
  type: 'error' | 'warning';
  setIsPopoverOpen: (flag: boolean) => void;
  onErrorClick: (error: MonacoMessage) => void;
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

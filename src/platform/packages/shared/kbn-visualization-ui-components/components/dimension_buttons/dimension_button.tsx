/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiButtonIcon,
  EuiLink,
  EuiToolTip,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiFontSize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { DimensionButtonIcon } from './dimension_button_icon';
import { PaletteIndicator } from './palette_indicator';
import type { AccessorConfig, Message } from './types';
import { emptyTitleText } from './constants';

const triggerLinkA11yText = (label: string) =>
  i18n.translate('visualizationUiComponents.dimensionButton.editConfig', {
    defaultMessage: 'Edit {label} configuration',
    values: {
      label: label.trim().length ? label : emptyTitleText,
    },
  });

export interface DimensionButtonProps {
  className?: string;
  groupLabel: string;
  children: React.ReactElement;
  onClick: (id: string) => void;
  onRemoveClick: (id: string) => void;
  accessorConfig: AccessorConfig;
  label: string;
  message?: Message;
}

function DimensionButtonImpl({
  groupLabel,
  children,
  onClick,
  onRemoveClick,
  accessorConfig,
  label,
  message,
  ...otherProps // from Drag&Drop integration
}: DimensionButtonProps) {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      {...otherProps}
      css={css`
        ${useEuiFontSize('s')}
        border-radius: ${euiTheme.border.radius};
        position: relative;
        line-height: 1;
        overflow: hidden;
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.s};
        min-height: ${euiTheme.size.xl};
        padding: ${euiTheme.size.xs} ${euiTheme.size.s};
        background-color: ${euiTheme.colors.backgroundBaseHighlighted};
      `}
    >
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="none" responsive={false}>
        <EuiFlexItem>
          <EuiToolTip content={message?.content} position="left">
            <EuiLink
              className="lnsLayerPanel__dimensionLink"
              css={css`
                width: 100%;
                &:hover {
                  text-decoration: none;
                }
              `}
              data-test-subj="lnsLayerPanel-dimensionLink"
              onClick={() => onClick(accessorConfig.columnId)}
              aria-label={triggerLinkA11yText(label)}
              title={triggerLinkA11yText(label)}
              color={
                message?.severity === 'error'
                  ? 'danger'
                  : message?.severity === 'warning'
                  ? 'warning'
                  : 'text'
              }
            >
              <DimensionButtonIcon severity={message?.severity} accessorConfig={accessorConfig}>
                {children}
              </DimensionButtonIcon>
            </EuiLink>
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiButtonIcon
        className="lnsLayerPanel__dimensionRemove"
        data-test-subj="indexPattern-dimension-remove"
        iconType="trash"
        size="xs"
        color="danger"
        aria-label={i18n.translate('visualizationUiComponents.dimensionButton.removeColumnLabel', {
          defaultMessage: 'Remove configuration from "{groupLabel}"',
          values: { groupLabel },
        })}
        title={i18n.translate('visualizationUiComponents.dimensionButton.removeColumnLabel', {
          defaultMessage: 'Remove configuration from "{groupLabel}"',
          values: { groupLabel },
        })}
        onClick={() => onRemoveClick(accessorConfig.columnId)}
        css={css`
          color: ${euiTheme.colors.textSubdued}
          transition: ${euiTheme.animation.fast} ease-in-out;
          transition-property: color, opacity, background-color, transform;
          opacity: 0;

          .domDraggable:hover &,
          .domDraggable:focus-within & {
            opacity: 1;
          }
          &:hover,
          &:focus {
            color: ${euiTheme.colors.textDanger};
          }
        `}
      />
      <PaletteIndicator accessorConfig={accessorConfig} />
    </div>
  );
}

export const DimensionButton = React.memo(DimensionButtonImpl);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButtonIcon, EuiLink, EuiToolTip, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { DimensionButtonIcon } from './dimension_button_icon';
import { PaletteIndicator } from './palette_indicator';
import type { AccessorConfig, Message } from './types';

const triggerLinkA11yText = (label: string) =>
  i18n.translate('visualizationUiComponents.dimensionButton.editConfig', {
    defaultMessage: 'Edit {label} configuration',
    values: { label },
  });

export function DimensionButton({
  groupLabel,
  children,
  onClick,
  onRemoveClick,
  accessorConfig,
  label,
  message,
  ...otherProps // from Drag&Drop integration
}: {
  className?: string;
  groupLabel: string;
  children: React.ReactElement;
  onClick: (id: string) => void;
  onRemoveClick: (id: string) => void;
  accessorConfig: AccessorConfig;
  label: string;
  message?: Message;
}) {
  return (
    <div {...otherProps}>
      <EuiFlexGroup direction="row" alignItems="center" gutterSize="none" responsive={false}>
        <EuiFlexItem>
          <EuiToolTip content={message?.content} position="left">
            <EuiLink
              className="lnsLayerPanel__dimensionLink"
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
          color: ${euiThemeVars.euiTextSubduedColor};
          &:hover {
            color: ${euiThemeVars.euiColorDangerText};
          }
        `}
      />
      <PaletteIndicator accessorConfig={accessorConfig} />
    </div>
  );
}

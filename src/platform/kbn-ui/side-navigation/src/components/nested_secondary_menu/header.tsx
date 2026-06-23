/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FC, ReactNode } from 'react';
import { EuiButtonIcon, EuiTitle, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

import type { PanelHeaderAction } from '../../../types';
import { usePanelHeaderActions } from '../../hooks/use_panel_header_actions';
import { useMenuHeaderStyle } from '../../hooks/use_menu_header_style';
import { useNestedMenu } from './use_nested_menu';

export interface HeaderProps {
  collapseButton?: ReactNode;
  title?: string;
  panelHeaderActions?: PanelHeaderAction[];
  'aria-describedby'?: string;
}

export const Header: FC<HeaderProps> = ({
  collapseButton,
  title,
  panelHeaderActions,
  'aria-describedby': ariaDescribedBy,
}) => {
  const { goBack } = useNestedMenu();
  const { euiTheme } = useEuiTheme();
  const headerStyle = useMenuHeaderStyle();
  const resolvedPanelHeaderActions = usePanelHeaderActions(panelHeaderActions);

  const titleStyle = css`
    align-items: center;
    background: ${euiTheme.colors.backgroundBasePlain};
    border-radius: ${euiTheme.border.radius.medium};
    display: flex;
    gap: ${euiTheme.size.s};
    justify-content: space-between;
    ${headerStyle}
  `;

  const titleGroupStyles = css`
    align-items: center;
    display: flex;
    gap: ${euiTheme.size.xs};
    min-width: 0;
  `;

  const headerTrailingStyles = css`
    align-items: center;
    display: flex;
    flex-shrink: 0;
    gap: ${euiTheme.size.xs};
  `;

  return (
    <div css={titleStyle}>
      <div css={titleGroupStyles}>
        <EuiToolTip
          content={i18n.translate('kbnUI.sideNavigation.goBackButtonIconAriaLabel', {
            defaultMessage: 'Go back',
          })}
          disableScreenReaderOutput
        >
          <EuiButtonIcon
            aria-describedby={ariaDescribedBy}
            aria-label={i18n.translate('kbnUI.sideNavigation.goBackButtonIconAriaLabel', {
              defaultMessage: 'Go back',
            })}
            color="text"
            iconType="chevronSingleLeft"
            onClick={goBack}
          />
        </EuiToolTip>
        {title && (
          <EuiTitle size="xs">
            <h4>{title}</h4>
          </EuiTitle>
        )}
      </div>
      {(resolvedPanelHeaderActions?.length || collapseButton) && (
        <div css={headerTrailingStyles}>
          {resolvedPanelHeaderActions?.map((action) => (
            <EuiButtonIcon
              key={action.id}
              id={action.id}
              aria-label={action['aria-label']}
              color="text"
              data-test-subj={action['data-test-subj']}
              display="empty"
              iconType={action.iconType}
              onClick={action.onClick}
              size="xs"
            />
          ))}
          {collapseButton}
        </div>
      )}
    </div>
  );
};

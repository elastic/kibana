/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiIcon, EuiText, EuiFlexGroup, EuiFlexItem, IconType } from '@elastic/eui';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';

export const ChartSwitchTrigger = function ({
  label,
  icon,
  onClick,
  dataTestSubj,
}: {
  label: string;
  icon?: IconType;
  onClick: () => void;
  dataTestSubj?: string;
}) {
  return (
    <ToolbarButton
      data-test-subj={dataTestSubj}
      aria-label={label}
      onClick={onClick}
      fullWidth
      size="s"
      fontWeight="bold"
      label={<LayerChartSwitchLabel label={label} icon={icon} />}
    />
  );
};

const LayerChartSwitchLabel = function ({ label, icon }: { label: string; icon?: IconType }) {
  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      {icon && (
        <EuiFlexItem grow={false}>
          <EuiIcon type={icon} />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiText
          size="s"
          css={css`
            font-weight: 600;
            display: inline;
            padding-left: ${euiThemeVars.euiSizeS};
          `}
        >
          {label}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

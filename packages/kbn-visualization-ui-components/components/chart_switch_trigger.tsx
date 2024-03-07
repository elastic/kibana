/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  size = 's',
}: {
  label: string;
  icon?: IconType;
  onClick: () => void;
  dataTestSubj?: string;
  size?: 's' | 'm';
}) {
  return (
    <ToolbarButton
      data-test-subj={dataTestSubj}
      aria-label={label}
      onClick={onClick}
      fullWidth
      size={size}
      fontWeight="bold"
      label={
        size === 'm' ? (
          <ChartSwitchLabel label={label} icon={icon} />
        ) : (
          <LayerChartSwitchLabel label={label} icon={icon} />
        )
      }
    />
  );
};

const ChartSwitchLabel = function ({ label, icon }: { label: string; icon?: IconType }) {
  return (
    <>
      {icon && <EuiIcon size="l" className="lnsChartSwitch__summaryIcon" type={icon} />}
      <span className="lnsChartSwitch__summaryText">{label}</span>
    </>
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

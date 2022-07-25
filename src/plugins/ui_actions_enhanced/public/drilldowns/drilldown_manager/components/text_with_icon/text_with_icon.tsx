/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import {
  EuiTextColor,
  EuiTextColorProps,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';

export interface TextWithIconProps {
  color?: EuiTextColorProps['color'];
  tooltip?: React.ReactNode;
  icon?: string;
  iconColor?: string;
  iconTooltip?: React.ReactNode;
}

export const TextWithIcon: React.FC<TextWithIconProps> = ({
  color,
  tooltip,
  icon,
  iconColor,
  iconTooltip,
  children,
}) => {
  return (
    <EuiFlexGroup responsive={false} alignItems="center" gutterSize={'s'}>
      {!!icon && (
        <EuiFlexItem grow={false}>
          {!!iconTooltip ? (
            <EuiToolTip content={iconTooltip}>
              <EuiIcon color={iconColor} type={icon} />
            </EuiToolTip>
          ) : (
            <EuiIcon color={iconColor} type={icon} />
          )}
        </EuiFlexItem>
      )}
      {!!children && (
        <EuiFlexItem grow={false} style={{ flexWrap: 'wrap' }}>
          {tooltip ? (
            <EuiToolTip content={tooltip}>
              <EuiTextColor color={color}>{children}</EuiTextColor>
            </EuiToolTip>
          ) : (
            <EuiTextColor color={color}>{children}</EuiTextColor>
          )}
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

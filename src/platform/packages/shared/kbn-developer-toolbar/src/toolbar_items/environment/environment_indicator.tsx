/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBadge, EuiToolTip } from '@elastic/eui';
import { css } from '@emotion/react';
import type { EnvironmentMode, PackageInfo } from '@kbn/config';

export interface EnvironmentInfo {
  mode: EnvironmentMode;
  packageInfo: PackageInfo;
}

const badgeStyles = css`
  cursor: default;
`;

export interface EnvironmentIndicatorProps {
  env: EnvironmentInfo;
  customLabel?: string;
}

export const EnvironmentIndicator: React.FC<EnvironmentIndicatorProps> = ({
  env: { mode, packageInfo },
  customLabel,
}) => {
  const isProduction = mode.name === 'production';
  const badgeColor = isProduction ? 'warning' : '#0B1628';
  const iconType = isProduction ? 'logoKibana' : 'wrench';

  const tooltipContent = (
    <div>
      <div>
        <strong>Environment:</strong> {mode.name}
      </div>
      <div>
        <strong>Version:</strong> {packageInfo.version}
      </div>
      <div>
        <strong>Build:</strong> {packageInfo.buildNum}
      </div>
      <div>
        <strong>Branch:</strong> {packageInfo.branch}
      </div>
      <div>
        <strong>Flavor:</strong> {packageInfo.buildFlavor}
      </div>
      {packageInfo.dist && (
        <div>
          <strong>Distribution:</strong> Yes
        </div>
      )}
      <div>
        <strong>Build Date:</strong> {new Date(packageInfo.buildDate).toLocaleDateString()}
      </div>
    </div>
  );

  const envName = mode.name.charAt(0).toUpperCase() + mode.name.slice(1);
  const isServerless = packageInfo.buildFlavor === 'serverless';
  const defaultDisplayText = isServerless
    ? `${envName} (serverless)`
    : `${envName} v${packageInfo.version}`;

  const displayText = customLabel?.trim() || defaultDisplayText;

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiBadge color={badgeColor} css={badgeStyles} iconType={iconType} iconSide="left">
        {displayText}
      </EuiBadge>
    </EuiToolTip>
  );
};

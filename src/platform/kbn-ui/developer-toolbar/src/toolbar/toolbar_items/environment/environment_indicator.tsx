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
import type { EnvironmentInfo } from '../../types';

const badgeStyles = css`
  cursor: default;
`;

export interface EnvironmentIndicatorProps {
  env: EnvironmentInfo;
  customLabel?: string;
  /** Badge icon used in production mode. */
  iconType?: string;
}

const formatBuildDate = (buildDate: Date | string | number | undefined): string | undefined => {
  if (buildDate === undefined || buildDate === '') return undefined;
  const date = new Date(buildDate);
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleDateString();
};

export const EnvironmentIndicator: React.FC<EnvironmentIndicatorProps> = ({
  env: { mode, packageInfo = {}, labels },
  customLabel,
  iconType: productionIconType = 'logoKibana',
}) => {
  const isProduction = mode.name === 'production';
  const badgeColor = isProduction ? 'warning' : '#0B1628';
  const iconType = isProduction ? productionIconType : 'wrench';
  const buildDate = formatBuildDate(packageInfo.buildDate);

  const tooltipContent = (
    <div>
      <div>
        <strong>Environment:</strong> {mode.name}
      </div>
      {packageInfo.version && (
        <div>
          <strong>Version:</strong> {packageInfo.version}
        </div>
      )}
      {packageInfo.buildNum !== undefined && (
        <div>
          <strong>Build:</strong> {packageInfo.buildNum}
        </div>
      )}
      {packageInfo.branch && (
        <div>
          <strong>Branch:</strong> {packageInfo.branch}
        </div>
      )}
      {packageInfo.buildFlavor && (
        <div>
          <strong>Flavor:</strong> {packageInfo.buildFlavor}
        </div>
      )}
      {packageInfo.dist && (
        <div>
          <strong>Distribution:</strong> Yes
        </div>
      )}
      {buildDate && (
        <div>
          <strong>Build Date:</strong> {buildDate}
        </div>
      )}
      {labels &&
        Object.entries(labels).map(([label, value]) => (
          <div key={label}>
            <strong>{label}:</strong> {value}
          </div>
        ))}
    </div>
  );

  const envName = mode.name.charAt(0).toUpperCase() + mode.name.slice(1);
  const isServerless = packageInfo.buildFlavor === 'serverless';
  const versionSuffix = packageInfo.version ? ` v${packageInfo.version}` : '';
  const defaultDisplayText = isServerless
    ? `${envName} (serverless)`
    : `${envName}${versionSuffix}`;

  const displayText = customLabel?.trim() || defaultDisplayText;

  return (
    <EuiToolTip content={tooltipContent}>
      <EuiBadge
        color={badgeColor}
        css={badgeStyles}
        iconType={iconType}
        iconSide="left"
        tabIndex={0}
      >
        {displayText}
      </EuiBadge>
    </EuiToolTip>
  );
};

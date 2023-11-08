/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { AccessorConfig, Message } from './types';

const getIconFromAccessorConfig = (accessorConfig: AccessorConfig) => (
  <>
    {accessorConfig.triggerIconType === 'color' && accessorConfig.color && (
      <EuiIcon
        color={accessorConfig.color}
        type="stopFilled"
        aria-label={i18n.translate(
          'visualizationUiComponents.dimensionButtonIcon.colorIndicatorLabel',
          {
            defaultMessage: 'Color of this dimension: {hex}',
            values: {
              hex: accessorConfig.color,
            },
          }
        )}
      />
    )}
    {accessorConfig.triggerIconType === 'disabled' && (
      <EuiIcon
        type="stopSlash"
        color="subdued"
        aria-label={i18n.translate(
          'visualizationUiComponents.dimensionButtonIcon.noColorIndicatorLabel',
          {
            defaultMessage: 'This dimension does not have an individual color',
          }
        )}
      />
    )}
    {accessorConfig.triggerIconType === 'invisible' && (
      <EuiIcon
        type="eyeClosed"
        color="subdued"
        aria-label={i18n.translate(
          'visualizationUiComponents.dimensionButtonIcon.invisibleIndicatorLabel',
          {
            defaultMessage: 'This dimension is currently not visible in the chart',
          }
        )}
      />
    )}
    {accessorConfig.triggerIconType === 'aggregate' && (
      <EuiIcon
        type="fold"
        color="subdued"
        aria-label={i18n.translate(
          'visualizationUiComponents.dimensionButtonIcon.aggregateIndicatorLabel',
          {
            defaultMessage:
              'This dimension is not visible in the chart because all individual values are aggregated into a single value',
          }
        )}
      />
    )}
    {accessorConfig.triggerIconType === 'colorBy' && (
      <EuiIcon
        type="color"
        color="subdued"
        aria-label={i18n.translate(
          'visualizationUiComponents.dimensionButtonIcon.paletteColorIndicatorLabel',
          {
            defaultMessage: 'This dimension is using a palette',
          }
        )}
      />
    )}
    {accessorConfig.triggerIconType === 'custom' && accessorConfig.customIcon && (
      <EuiIcon
        type={accessorConfig.customIcon}
        color={accessorConfig.color}
        aria-label={i18n.translate(
          'visualizationUiComponents.dimensionButtonIcon.customIconIndicatorLabel',
          {
            defaultMessage: 'This dimension is using a custom icon',
          }
        )}
      />
    )}
  </>
);

export function DimensionButtonIcon({
  accessorConfig,
  severity,
  children,
}: {
  accessorConfig: AccessorConfig;
  severity?: Message['severity'];
  children: React.ReactChild;
}) {
  let indicatorIcon = null;
  if (
    severity ||
    (accessorConfig.triggerIconType !== 'none' && accessorConfig.triggerIconType !== undefined)
  ) {
    indicatorIcon = (
      <>
        {accessorConfig.triggerIconType !== 'none' && (
          <EuiFlexItem grow={false}>{getIconFromAccessorConfig(accessorConfig)}</EuiFlexItem>
        )}
        {severity && (
          <EuiFlexItem grow={false}>
            <EuiIcon type={severity === 'error' ? 'error' : 'alert'} />
          </EuiFlexItem>
        )}
      </>
    );
  }

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      {indicatorIcon}
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}

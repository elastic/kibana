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
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItem,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export type ReportColorMode = 'light' | 'dark';

const colorModeTitle = i18n.translate('share.exportFlyoutContent.colorMode.legend', {
  defaultMessage: 'Color mode',
});

const colorModeDescription = i18n.translate('share.exportFlyoutContent.colorMode.description', {
  defaultMessage: 'This setting applies to the export, not the current appearance.',
});

const lightLabel = i18n.translate('share.exportFlyoutContent.colorMode.lightLabel', {
  defaultMessage: 'Light',
});

const darkLabel = i18n.translate('share.exportFlyoutContent.colorMode.darkLabel', {
  defaultMessage: 'Dark',
});

const recommendedBadgeLabel = i18n.translate(
  'share.exportFlyoutContent.colorMode.recommendedBadge',
  {
    defaultMessage: 'Recommended',
  }
);

const printRecommendedTooltip = i18n.translate(
  'share.exportFlyoutContent.colorMode.printRecommendedTooltip',
  {
    defaultMessage: 'Light is recommended for printed reports.',
  }
);

export interface ColorModeKeyPadProps {
  colorMode: ReportColorMode;
  onChange: (colorMode: ReportColorMode) => void;
  usePrintLayout?: boolean;
  isDisabled?: boolean;
}

export function ColorModeKeyPad({
  colorMode,
  onChange,
  usePrintLayout = false,
  isDisabled = false,
}: ColorModeKeyPadProps) {
  return (
    <EuiFormRow
      label={
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <h4>{colorModeTitle}</h4>
            </EuiText>
          </EuiFlexItem>
          {usePrintLayout && (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={printRecommendedTooltip}>
                <EuiBadge color="success" tabIndex={0} data-test-subj="reportColorModeRecommended">
                  {recommendedBadgeLabel}
                </EuiBadge>
              </EuiToolTip>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
      fullWidth
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiText size="s" color="subdued">
            {colorModeDescription}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiKeyPadMenu
            data-test-subj="reportColorModeMenu"
            checkable={{
              ariaLegend: colorModeTitle,
            }}
          >
            <EuiKeyPadMenuItem
              name="reportColorMode"
              label={lightLabel}
              checkable="single"
              isSelected={colorMode === 'light'}
              isDisabled={isDisabled}
              onChange={() => onChange('light')}
              data-test-subj="reportColorModeLight"
            >
              <EuiIcon type="sun" size="l" aria-hidden={true} />
            </EuiKeyPadMenuItem>
            <EuiKeyPadMenuItem
              name="reportColorMode"
              label={darkLabel}
              checkable="single"
              isSelected={colorMode === 'dark'}
              isDisabled={isDisabled}
              onChange={() => onChange('dark')}
              data-test-subj="reportColorModeDark"
            >
              <EuiIcon type="moon" size="l" aria-hidden={true} />
            </EuiKeyPadMenuItem>
          </EuiKeyPadMenu>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiIcon, EuiKeyPadMenu, EuiKeyPadMenuItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';

const PRIMARY_NAV_LABELS_KEYPAD_NAME = 'primaryNavLabels';

interface Props {
  hidePrimaryLabels: boolean;
  onChange: (hidePrimaryLabels: boolean) => void;
}

export const PrimaryNavLabelsKeyPadMenu = ({ hidePrimaryLabels, onChange }: Props) => {
  return (
    <EuiKeyPadMenu
      aria-label={i18n.translate('navigationCustomizationComponents.primaryNavLabelsAriaLabel', {
        defaultMessage: 'Primary navigation labels',
      })}
      checkable={{
        ariaLegend: i18n.translate('navigationCustomizationComponents.primaryNavLabelsLegend', {
          defaultMessage: 'Primary navigation labels',
        }),
      }}
      data-test-subj="primaryNavLabelsKeyPadMenu"
    >
      <EuiKeyPadMenuItem
        checkable="single"
        data-test-subj="primaryNavLabelsShow"
        isSelected={!hidePrimaryLabels}
        label={i18n.translate('navigationCustomizationComponents.showLabelsLabel', {
          defaultMessage: 'Show labels',
        })}
        name={PRIMARY_NAV_LABELS_KEYPAD_NAME}
        onChange={() => onChange(false)}
      >
        <EuiIcon type="list" size="l" aria-hidden />
      </EuiKeyPadMenuItem>
      <EuiKeyPadMenuItem
        checkable="single"
        data-test-subj="primaryNavLabelsHide"
        isSelected={hidePrimaryLabels}
        label={i18n.translate('navigationCustomizationComponents.hideLabelsLabel', {
          defaultMessage: 'Hide labels',
        })}
        name={PRIMARY_NAV_LABELS_KEYPAD_NAME}
        onChange={() => onChange(true)}
      >
        <EuiIcon type="menu" size="l" aria-hidden />
      </EuiKeyPadMenuItem>
    </EuiKeyPadMenu>
  );
};

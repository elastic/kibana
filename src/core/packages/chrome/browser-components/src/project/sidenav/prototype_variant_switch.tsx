/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { EuiButtonGroup, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  DATA_MANAGEMENT_NAV_ID,
  getDataManagementPrototypeVariant,
  setDataManagementPrototypeVariant,
  subscribeDataManagementPrototypeVariant,
  type DataManagementPrototypeVariant,
} from '@kbn/deeplinks-management';
import type { MenuItem } from '@kbn/ui-side-navigation/types';

const prototypeLabel = i18n.translate('core.ui.chrome.sideNavigation.prototypeVariantLabel', {
  defaultMessage: 'Prototype',
});

const prototypeLegend = i18n.translate('core.ui.chrome.sideNavigation.prototypeVariantLegend', {
  defaultMessage: 'Prototype variant',
});

const variantOptions: Array<{ id: DataManagementPrototypeVariant; label: string }> = [
  {
    id: 'v1',
    label: i18n.translate('core.ui.chrome.sideNavigation.prototypeVariant.v1', {
      defaultMessage: 'v1',
    }),
  },
  {
    id: 'v2',
    label: i18n.translate('core.ui.chrome.sideNavigation.prototypeVariant.v2', {
      defaultMessage: 'v2',
    }),
  },
];

const isVariant = (value: string): value is DataManagementPrototypeVariant =>
  value === 'v1' || value === 'v2';

const PrototypeVariantSwitch = () => {
  const { euiTheme } = useEuiTheme();
  const [variant, setVariant] = useState(getDataManagementPrototypeVariant);

  useEffect(() => subscribeDataManagementPrototypeVariant(setVariant), []);

  return (
    <div
      css={css`
        border-top: ${euiTheme.border.thin};
        display: flex;
        flex-direction: column;
        gap: ${euiTheme.size.xs};
        padding: ${euiTheme.size.m};
      `}
      data-test-subj="dataManagementPrototypeVariant"
    >
      <EuiText size="xs">
        <span>{prototypeLabel}</span>
      </EuiText>
      <EuiButtonGroup
        buttonSize="compressed"
        idSelected={variant}
        isFullWidth
        legend={prototypeLegend}
        onChange={(id) => {
          if (isVariant(id)) {
            setDataManagementPrototypeVariant(id);
          }
        }}
        options={variantOptions.map((option) => ({
          ...option,
          'data-test-subj': `dataManagementPrototypeVariant-${option.id}`,
        }))}
      />
    </div>
  );
};

/** Footer for the data management side panel. Other panels have no footer. */
export const dataManagementPrototypeFooter = (openerNode: MenuItem) =>
  openerNode.id === DATA_MANAGEMENT_NAV_ID ? <PrototypeVariantSwitch /> : null;

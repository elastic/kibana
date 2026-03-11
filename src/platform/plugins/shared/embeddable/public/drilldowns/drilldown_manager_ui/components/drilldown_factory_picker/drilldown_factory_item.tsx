/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexItem, EuiIcon, EuiKeyPadMenuItem, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { txtInsufficientLicenseLevel } from './i18n';
import type { DrilldownFactory } from '../../types';

interface Props {
  factory: DrilldownFactory;
  onSelect: (drilldownType: string) => void;
}

export const DrilldownFactoryItem: React.FC<Props> = ({ factory, onSelect }) => {
  const showTooltip = !factory.isLicenseCompatible;
  const { euiTheme } = useEuiTheme();

  let content = (
    <EuiKeyPadMenuItem
      css={css`
        .euikeypadmenuitem__label {
          height: ${euiTheme.size.xl};
        }
      `}
      label={factory.displayName}
      data-test-subj={`drilldownFactoryItem-${factory.type}`}
      onClick={() => onSelect(factory.type)}
      disabled={!factory.isLicenseCompatible}
    >
      {factory.euiIcon && <EuiIcon type={factory.euiIcon} size="m" />}
    </EuiKeyPadMenuItem>
  );

  if (showTooltip) {
    content = <EuiToolTip content={txtInsufficientLicenseLevel}>{content}</EuiToolTip>;
  }

  return (
    <EuiFlexItem grow={false} key={factory.type}>
      {content}
    </EuiFlexItem>
  );
};

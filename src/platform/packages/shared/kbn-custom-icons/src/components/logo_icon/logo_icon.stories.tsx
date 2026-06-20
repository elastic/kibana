/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { StoryFn } from '@storybook/react';
import React from 'react';
import { LOGO_NAMES } from './get_logo_icon';
import { getLogoIcon } from './get_logo_icon';
import type { LogoName } from './get_logo_icon';
import { LogoIcon } from '.';

export default {
  title: 'Custom Icons/LogoIcon',
  component: LogoIcon,
};

const LogoCard = ({ logoName }: { logoName: LogoName }) => {
  const { colorMode } = useEuiTheme();
  const isDarkMode = colorMode === 'DARK';

  return (
    <EuiCard
      icon={
        <EuiToolTip position="top" content="Icon rendered with `EuiImage`">
          <EuiImage
            size="s"
            hasShadow
            alt={logoName}
            src={getLogoIcon(logoName, isDarkMode)}
            tabIndex={0}
          />
        </EuiToolTip>
      }
      title={logoName}
      description={
        <EuiToolTip position="bottom" content="Icon rendered with `LogoIcon`">
          <LogoIcon logoName={logoName} />
        </EuiToolTip>
      }
    />
  );
};

export const List: StoryFn = () => {
  return (
    <EuiFlexGroup gutterSize="l" wrap={true}>
      {LOGO_NAMES.map((logoName) => (
        <EuiFlexItem key={logoName} grow={false}>
          <LogoCard logoName={logoName} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

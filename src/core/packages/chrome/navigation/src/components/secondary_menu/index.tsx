/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiTitle, useEuiTheme } from '@elastic/eui';
import React, { FC, ReactNode } from 'react';
import { css } from '@emotion/react';

import { SecondaryMenuItem } from './item';
import { SecondaryMenuSection } from './section';

export interface SecondaryMenuProps {
  children: ReactNode;
  isPanel?: boolean;
  title: string;
}

interface SecondaryMenuComponent extends FC<SecondaryMenuProps> {
  Item: typeof SecondaryMenuItem;
  Section: typeof SecondaryMenuSection;
}

/**
 * This menu is reused between the side nav panel and the side nav popover.
 */
export const SecondaryMenu: SecondaryMenuComponent = ({ children, isPanel = false, title }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <div>
      <EuiTitle
        css={css`
          position: sticky;
          top: 0;
          z-index: 1;
          background: ${isPanel
            ? euiTheme.colors.backgroundBaseSubdued
            : euiTheme.colors.backgroundBasePlain};
          border-radius: ${euiTheme.border.radius.medium};
          // move into one declaration; 20px is forced by dividers
          padding: ${euiTheme.size.base} 20px;
          padding-bottom: ${euiTheme.size.xs};
        `}
        size="xs"
      >
        <h4>{title}</h4>
      </EuiTitle>
      {children}
    </div>
  );
};

SecondaryMenu.Item = SecondaryMenuItem;
SecondaryMenu.Section = SecondaryMenuSection;

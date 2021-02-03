/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { FC } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiToken,
  EuiTitle,
  EuiText,
  EuiIcon,
  IconType,
} from '@elastic/eui';

interface Props {
  title: string;
  subtitle: string;
  iconType: IconType;
}

export const SolutionTitle: FC<Props> = ({ title, subtitle, iconType }) => (
  <EuiFlexGroup gutterSize="none" alignItems="center">
    <EuiFlexItem className="eui-textCenter">
      <EuiToken
        iconType={iconType}
        shape="circle"
        fill="light"
        size="l"
        className="homSolutionPanel__icon"
      />

      <EuiTitle className="homSolutionPanel__title eui-textInheritColor" size="s">
        <h3>{title}</h3>
      </EuiTitle>

      <EuiText size="s">
        <p className="homSolutionPanel__subtitle">
          {subtitle} <EuiIcon type="sortRight" />
        </p>
      </EuiText>
    </EuiFlexItem>
  </EuiFlexGroup>
);

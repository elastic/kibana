/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { SolutionToolbarButton, Props as SolutionToolbarButtonProps } from './button';

import './primary_button.scss';

export interface Props extends Omit<SolutionToolbarButtonProps, 'primary'> {
  isDarkModeEnabled?: boolean;
}

export const PrimaryActionButton = ({ isDarkModeEnabled, ...props }: Props) => (
  <SolutionToolbarButton
    primary={true}
    className={`solutionToolbar__primaryButton ${
      isDarkModeEnabled
        ? 'solutionToolbar__primaryButton--dark'
        : 'solutionToolbar__primaryButton--light'
    }`}
    {...props}
  />
);

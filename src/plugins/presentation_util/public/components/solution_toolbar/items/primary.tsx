/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { SolutionToolbarButton, Props as SolutionToolbarButtonProps } from './button';
import { SolutionToolbarPopover, Props as SolutionToolbarPopoverProps } from './popover';

export const PrimaryActionPopover = (props: Omit<SolutionToolbarPopoverProps, 'primary'>) => (
  <SolutionToolbarPopover primary={true} {...props} />
);

export const PrimaryActionButton = (props: Omit<SolutionToolbarButtonProps, 'primary'>) => (
  <SolutionToolbarButton primary={true} {...props} />
);

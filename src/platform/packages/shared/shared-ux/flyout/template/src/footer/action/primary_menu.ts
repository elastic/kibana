/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FlyoutFooterPrimaryActionMenuProps } from '../../types';
import { primaryActionMenuPart } from './part';
import { PrimaryActionMenuButton } from './menu_button';

/** Declarative `FlyoutTemplate.Footer.PrimaryActionMenu`. */
export const PrimaryActionMenu =
  primaryActionMenuPart.createComponent<FlyoutFooterPrimaryActionMenuProps>({
    // 'resolve' is a plain function, not a React component, so we can't use hooks here.
    // The popover's open/close state must be handled inside PrimaryActionMenuButton instead.
    resolve: (attributes) => React.createElement(PrimaryActionMenuButton, attributes),
  });

PrimaryActionMenu.displayName = 'FlyoutTemplate.Footer.PrimaryActionMenu';

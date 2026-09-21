/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import type { FlyoutFooterPrimaryActionProps } from '../../types';
import { primaryActionPart } from './part';

/** Declarative `FlyoutTemplate.Footer.PrimaryAction`. */
export const PrimaryAction = primaryActionPart.createComponent<FlyoutFooterPrimaryActionProps>({
  resolve: ({ label, ...buttonProps }) =>
    React.createElement(EuiButton, { ...buttonProps, fill: true }, label),
});

PrimaryAction.displayName = 'FlyoutTemplate.Footer.PrimaryAction';

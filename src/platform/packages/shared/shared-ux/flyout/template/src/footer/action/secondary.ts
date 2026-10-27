/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import type { FlyoutFooterSecondaryActionProps } from '../../types';
import { secondaryActionPart } from './part';
import { resolveTooltipButtonProps, withTooltip } from './tooltip';

/** Declarative `FlyoutTemplate.Footer.SecondaryAction`. */
export const SecondaryAction =
  secondaryActionPart.createComponent<FlyoutFooterSecondaryActionProps>({
    resolve: ({ label, tooltip, ...buttonProps }) =>
      withTooltip(
        React.createElement(
          EuiButtonEmpty,
          { ...resolveTooltipButtonProps(buttonProps, tooltip), color: 'primary', size: 'm' },
          label
        ),
        tooltip
      ),
  });

SecondaryAction.displayName = 'FlyoutTemplate.Footer.SecondaryAction';

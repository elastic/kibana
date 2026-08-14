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

/** Declarative `FlyoutTemplate.Footer.SecondaryAction`. */
export const SecondaryAction =
  secondaryActionPart.createComponent<FlyoutFooterSecondaryActionProps>({
    resolve: ({
      label,
      onClick,
      iconType,
      color,
      isLoading,
      isDisabled,
      'data-test-subj': dataTestSubj,
    }) =>
      React.createElement(
        EuiButtonEmpty,
        {
          color,
          iconType,
          isLoading,
          isDisabled,
          onClick,
          'data-test-subj': dataTestSubj,
        },
        label
      ),
  });

SecondaryAction.displayName = 'FlyoutTemplate.Footer.SecondaryAction';

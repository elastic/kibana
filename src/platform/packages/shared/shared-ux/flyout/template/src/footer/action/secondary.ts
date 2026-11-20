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
import { AiButtonEmpty } from '@kbn/ui-ai-components';
import type { FlyoutFooterSecondaryActionProps } from '../../types';
import { secondaryActionPart } from './part';
import { resolveTooltipButtonProps, withTooltip } from './tooltip';

const renderButton = ({
  label,
  tooltip,
  ...props
}: FlyoutFooterSecondaryActionProps): React.ReactElement => {
  if (props.variant === 'ai') {
    const { variant: _variant, ...buttonProps } = props;
    return React.createElement(
      AiButtonEmpty,
      { ...resolveTooltipButtonProps(buttonProps, tooltip), size: 'm' },
      label
    );
  }
  const { variant: _variant, ...buttonProps } = props;
  return React.createElement(
    EuiButtonEmpty,
    { ...resolveTooltipButtonProps(buttonProps, tooltip), color: 'primary', size: 'm' },
    label
  );
};

/** Declarative `FlyoutTemplate.Footer.SecondaryAction`. */
export const SecondaryAction =
  secondaryActionPart.createComponent<FlyoutFooterSecondaryActionProps>({
    resolve: (props) => withTooltip(renderButton(props), props.tooltip),
  });

SecondaryAction.displayName = 'FlyoutTemplate.Footer.SecondaryAction';

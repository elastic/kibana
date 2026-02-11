/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { EuiButtonSize, EuiButtonEmptySizes, EuiButtonIconProps } from '@elastic/eui';
import { EuiButton, EuiButtonEmpty, EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useAiButtonGradientStyles } from './use_ai_button_gradient_styles';

export type AiButtonVariant = 'primary' | 'secondary' | 'empty' | 'iconOnly';

interface AiButtonBaseProps {
  isDisabled?: boolean;
  onClick?: () => void;
  className?: string;
  'data-test-subj'?: string;
}

interface AiClassicButtonProps extends AiButtonBaseProps {
  variant: 'primary' | 'secondary';
  size?: EuiButtonSize;
  iconType?: string;
  iconSide?: 'left' | 'right';
  children: React.ReactNode;
}

interface AiButtonEmptyProps extends AiButtonBaseProps {
  variant: 'empty';
  size?: EuiButtonEmptySizes;
  iconType?: string;
  iconSide?: 'left' | 'right';
  flush?: 'both' | 'left' | 'right';
  children: React.ReactNode;
}

interface AiButtonIconOnlyProps extends AiButtonBaseProps {
  variant: 'iconOnly';
  size?: EuiButtonSize;
  iconType: string;
  /**
   * Controls the icon-only AI style.
   * - `primary`: filled AI gradient background + inverse (white) icon
   * - `secondary`: subtle AI gradient background
   * - `empty`: no background/border (EUI empty icon button display)
   */
  iconOnlyVariant?: Exclude<AiButtonVariant, 'iconOnly'>;
  tooltipContent?: string;
  tooltipTitle?: string;
  'aria-label': string;
}

export type AiButtonProps = AiClassicButtonProps | AiButtonEmptyProps | AiButtonIconOnlyProps;

const ICON_DISPLAY_MAP: Record<string, NonNullable<EuiButtonIconProps['display']>> = {
  empty: 'empty',
  primary: 'fill',
};

const defaultTooltipTitle = i18n.translate('sharedUXPackages.aiButton.tooltipTitle', {
  defaultMessage: 'AI Assistant',
});

const defaultTooltipContent = i18n.translate('sharedUXPackages.aiButton.tooltipContent', {
  defaultMessage: 'AI-powered assistance',
});

export const AiButton: React.FC<AiButtonProps> = (props) => {
  const effectiveVariant =
    props.variant === 'iconOnly' ? props.iconOnlyVariant ?? 'secondary' : props.variant;
  const fill = effectiveVariant === 'primary';
  const { buttonCss, labelCss } = useAiButtonGradientStyles({ fill });

  switch (props.variant) {
    case 'primary':
    case 'secondary':
      return (
        <EuiButton
          css={buttonCss}
          fill={props.variant === 'primary'}
          size={props.size}
          iconType={props.iconType}
          iconSide={props.iconSide}
          isDisabled={props.isDisabled}
          onClick={props.onClick}
          className={props.className}
          data-test-subj={props['data-test-subj']}
        >
          <span css={labelCss}>{props.children}</span>
        </EuiButton>
      );

    case 'empty':
      return (
        <EuiButtonEmpty
          size={props.size}
          iconType={props.iconType}
          iconSide={props.iconSide}
          flush={props.flush}
          isDisabled={props.isDisabled}
          onClick={props.onClick}
          className={props.className}
          data-test-subj={props['data-test-subj']}
        >
          <span css={labelCss}>{props.children}</span>
        </EuiButtonEmpty>
      );

    case 'iconOnly': {
      const { iconOnlyVariant = 'secondary' } = props;
      const display = ICON_DISPLAY_MAP[iconOnlyVariant] ?? 'base';

      return (
        <EuiToolTip
          position="top"
          title={props.tooltipTitle ?? defaultTooltipTitle}
          content={props.tooltipContent ?? defaultTooltipContent}
        >
          <EuiButtonIcon
            css={display === 'empty' ? undefined : buttonCss}
            display={display}
            size={props.size}
            iconType={props.iconType}
            isDisabled={props.isDisabled}
            onClick={props.onClick}
            className={props.className}
            data-test-subj={props['data-test-subj']}
            aria-label={props['aria-label']}
          />
        </EuiToolTip>
      );
    }
  }
};

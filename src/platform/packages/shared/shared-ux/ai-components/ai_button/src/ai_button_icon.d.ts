import React from 'react';
import type { DistributiveOmit } from '@elastic/eui';
import type { AiButtonProps } from './types';
/** Props for the icon-only AI button component. */
export type AiButtonIconProps = DistributiveOmit<Extract<AiButtonProps, {
    iconOnly: true;
}>, 'iconOnly'>;
/**
 * Renders the icon-only AI button.
 * @param props - Props accepted by the icon-only variant.
 */
export declare const AiButtonIcon: (props: AiButtonIconProps) => React.JSX.Element;

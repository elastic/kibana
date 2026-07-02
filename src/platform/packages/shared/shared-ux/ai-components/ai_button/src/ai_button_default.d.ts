import React from 'react';
import type { AiButtonProps } from './types';
/** Props for the default text AI button variants (`base` and `accent`). */
export type AiButtonDefaultProps = Extract<AiButtonProps, {
    iconOnly?: false;
    variant?: 'accent' | 'base';
}>;
/**
 * Renders the default text AI button variants (`base` and `accent`).
 * Default variant is `'base'` when omitted.
 * @param props - Props accepted by the default AI button variant.
 */
export declare const AiButtonDefault: (props: AiButtonDefaultProps) => React.JSX.Element;

import React from 'react';
import type { SpacingLine } from '../lib/dom/calculate_spacing';
interface Props {
    lines: SpacingLine[];
}
/**
 * SpacingMeasurement renders measurement lines between two elements,
 * showing pixel distances with indicator lines.
 */
export declare const SpacingMeasurement: ({ lines }: Props) => React.JSX.Element | null;
export {};

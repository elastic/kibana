import React from 'react';
import type { ActionConfig } from './types';
export interface FooterProps {
    readonly action?: ActionConfig;
}
/**
 * Renders a single footer action row.
 */
export declare const Footer: ({ action }: FooterProps) => React.JSX.Element | null;

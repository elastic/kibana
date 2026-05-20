/** @jsxRuntime classic */
/** @jsx jsx */
import { jsx } from '@emotion/react';
import type { CustomIntegration } from '../../../common';
export interface Props {
    replacements: Array<Pick<CustomIntegration, 'id' | 'uiInternalPath' | 'title'>>;
}
/**
 * A pure component, an accordion panel which can display information about replacements for a given EPR module.
 */
export declare const ReplacementCard: ({ replacements }: Props) => jsx.JSX.Element | null;

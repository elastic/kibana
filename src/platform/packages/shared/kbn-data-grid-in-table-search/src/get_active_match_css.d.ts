import { type SerializedStyles } from '@emotion/react';
import type { ActiveMatch } from './types';
import type { getHighlightColors } from './get_highlight_colors';
export interface GetActiveMatchCssProps {
    activeMatch: ActiveMatch;
    colors: ReturnType<typeof getHighlightColors>;
}
export declare const getActiveMatchCss: ({ activeMatch, colors, }: GetActiveMatchCssProps) => SerializedStyles;

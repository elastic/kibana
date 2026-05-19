import React from 'react';
import type { EuiInlineEditTextSizes } from '@elastic/eui/src/components/inline_edit/inline_edit_text';
export interface DurationProps {
    duration: number;
    parent?: {
        duration?: number;
        type: 'trace' | 'transaction';
        loading?: boolean;
    };
    size?: EuiInlineEditTextSizes;
    showTooltip?: boolean;
}
export declare function Duration({ duration, parent, size, showTooltip }: DurationProps): React.JSX.Element;

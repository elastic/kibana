import type { ReactNode } from 'react';
import React from 'react';
export declare const HEADER_BUTTON_HEIGHT_PX = 32;
export declare const HEADER_BUTTON_SQUARE_WIDTH_PX = 32;
export declare const headerButtonBaseStyles: import("@emotion/utils").SerializedStyles;
export declare const headerButtonBorderedStyles: import("@emotion/utils").SerializedStyles;
export declare const useHeaderButtonStyleVars: () => React.CSSProperties;
export interface HeaderActionButtonProps extends Pick<React.AriaAttributes, 'aria-expanded' | 'aria-haspopup'> {
    variant: 'bordered' | 'plain';
    children: ReactNode;
    onClick: () => void;
    'aria-label': string;
    'data-test-subj'?: string;
}
export declare const HeaderActionButton: React.ForwardRefExoticComponent<HeaderActionButtonProps & React.RefAttributes<HTMLButtonElement>>;

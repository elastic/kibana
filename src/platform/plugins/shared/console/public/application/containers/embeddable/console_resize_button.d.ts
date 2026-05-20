import React from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
export interface EmbeddedConsoleResizeButtonProps {
    consoleHeight: number;
    setConsoleHeight: React.Dispatch<React.SetStateAction<number>>;
}
export declare function getCurrentConsoleMaxSize(euiTheme: EuiThemeComputed<{}>): number;
export declare const EmbeddedConsoleResizeButton: ({ consoleHeight, setConsoleHeight, }: EmbeddedConsoleResizeButtonProps) => React.JSX.Element;

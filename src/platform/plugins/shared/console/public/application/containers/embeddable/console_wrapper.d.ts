import React from 'react';
import type { EmbeddableConsoleDependencies } from '../../../types';
interface ConsoleWrapperProps extends Omit<EmbeddableConsoleDependencies, 'setDispatch' | 'alternateView' | 'setConsoleHeight' | 'getConsoleHeight'> {
    onKeyDown: (this: Window, ev: WindowEventMap['keydown']) => any;
    isOpen: boolean;
}
export declare const ConsoleWrapper: (props: ConsoleWrapperProps) => React.JSX.Element | null;
export {};

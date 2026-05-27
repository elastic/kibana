/**
 * Fullscreen logic
 */
import React, { type KeyboardEvent } from 'react';
export declare const useFullScreen: ({ allowFullScreen }: {
    allowFullScreen?: boolean;
}) => {
    FullScreenButton: React.FC<{}>;
    FullScreenDisplay: ({ children }: {
        children: Array<JSX.Element | null> | JSX.Element;
    }) => React.JSX.Element;
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
    isFullScreen: boolean;
    setIsFullScreen: React.Dispatch<React.SetStateAction<boolean>>;
};

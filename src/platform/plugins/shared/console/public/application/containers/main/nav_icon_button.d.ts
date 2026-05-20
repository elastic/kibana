import React from 'react';
interface NavIconButtonProps {
    iconType: string;
    onClick: () => void;
    ariaLabel: string;
    dataTestSubj: string;
    toolTipContent: string;
}
export declare const NavIconButton: ({ iconType, onClick, ariaLabel, dataTestSubj, toolTipContent, }: NavIconButtonProps) => React.JSX.Element;
export {};

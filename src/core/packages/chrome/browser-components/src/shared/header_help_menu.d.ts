import React from 'react';
interface HeaderHelpMenuProps {
    renderButton?: (props: {
        isOpen: boolean;
        toggleMenu: () => void;
    }) => NonNullable<React.ReactNode>;
}
export declare const HeaderHelpMenu: ({ renderButton }?: HeaderHelpMenuProps) => React.JSX.Element;
export {};

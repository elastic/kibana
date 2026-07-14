import React from 'react';
export interface ChromeNavigationProps {
    isCollapsed: boolean;
    setWidth: (width: number) => void;
    onToggleCollapsed?: (isCollapsed: boolean) => void;
}
export declare const Navigation: (props: ChromeNavigationProps) => React.JSX.Element | null;
export default Navigation;

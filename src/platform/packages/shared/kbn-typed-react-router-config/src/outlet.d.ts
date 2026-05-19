import React from 'react';
export declare function OutletContextProvider({ element, children, }: {
    element: React.ReactElement;
    children: React.ReactNode;
}): React.JSX.Element;
export declare function Outlet(): React.ReactElement<any, string | React.JSXElementConstructor<any>> | null;

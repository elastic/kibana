import React from 'react';
type DivProps = Pick<React.HTMLAttributes<HTMLDivElement>, 'className' | 'style' | 'children'>;
export interface Props extends DivProps {
    appFixedViewport?: HTMLElement;
    id: string;
    index?: number;
    type: string;
    key: string;
    isRenderable?: boolean;
    setDragHandles?: (refs: Array<HTMLElement | null>) => void;
}
export declare const Item: React.ForwardRefExoticComponent<Props & React.RefAttributes<HTMLDivElement>>;
export declare const ObservedItem: React.ForwardRefExoticComponent<Props & React.RefAttributes<HTMLDivElement>>;
export declare const DashboardGridItem: React.ForwardRefExoticComponent<Props & React.RefAttributes<HTMLDivElement>>;
export {};

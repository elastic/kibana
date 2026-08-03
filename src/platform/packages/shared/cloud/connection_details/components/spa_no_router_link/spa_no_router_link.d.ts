import * as React from 'react';
export interface SpaNoRouterLinkProps {
    url: string;
    go?: (url: string) => void;
    onClick?: React.MouseEventHandler;
    'data-test-subj'?: string;
}
export declare const SpaNoRouterLink: React.FC<React.PropsWithChildren<SpaNoRouterLinkProps>>;

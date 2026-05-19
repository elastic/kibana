import type { ReactNode } from 'react';
import React from 'react';
export interface GlobalRedirectAppLinkProps {
    children?: ReactNode;
    navigateToUrl: (url: string) => Promise<void> | void;
}
/**
 * Global click delegator: intercepts safe, same-origin <a> clicks and routes via navigateToUrl.
 * Opt out with: <a data-kbn-redirect-app-link-ignore>
 */
export declare const GlobalRedirectAppLink: ({ children, navigateToUrl }: GlobalRedirectAppLinkProps) => React.JSX.Element;

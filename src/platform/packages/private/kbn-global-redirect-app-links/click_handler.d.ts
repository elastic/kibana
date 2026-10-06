/**
 * Creates a click handler that intercepts safe, same-origin <a> clicks and routes via navigateToUrl.
 * Opt out with: <a data-kbn-redirect-app-link-ignore>
 */
export declare function createClickHandler(navigateToUrl: (url: string) => Promise<void> | void): (event: MouseEvent) => void;

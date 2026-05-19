import type { ChromeNavLink } from '@kbn/core-chrome-browser';
export declare class NavLinkWrapper {
    readonly id: string;
    readonly properties: Readonly<ChromeNavLink>;
    constructor(properties: ChromeNavLink);
}

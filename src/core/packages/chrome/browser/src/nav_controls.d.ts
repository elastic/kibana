import type { ReactNode } from 'react';
import type { Observable } from 'rxjs';
import type { MountPoint } from '@kbn/core-mount-utils-browser';
/** @public */
export interface ChromeNavControl {
    order?: number;
    /**
     * The content to render for this nav control as a React node.
     */
    content?: ReactNode;
    /**
     * @deprecated Use {@link ChromeNavControl.content} instead.
     */
    mount?: MountPoint;
}
/** @public */
export interface ChromeHelpMenuLink {
    title: string;
    href?: string;
    onClick?: () => void;
    iconType?: string;
    dataTestSubj?: string;
}
/**
 * {@link ChromeNavControls | APIs} for registering new controls to be displayed in the navigation bar.
 *
 * @example
 * Register a left-side nav control with a React element.
 * ```jsx
 * chrome.navControls.registerLeft({
 *   content: <MyControl />
 * })
 * ```
 *
 * @public
 */
export interface ChromeNavControls {
    /** Register a nav control to be presented on the bottom-left side of the chrome header. */
    registerLeft(navControl: ChromeNavControl): void;
    /** Register a nav control to be presented on the top-right side of the chrome header. */
    registerRight(navControl: ChromeNavControl): void;
    /** Register a nav control to be presented on the top-center side of the chrome header. */
    registerCenter(navControl: ChromeNavControl): void;
    /**
     * Set the help menu links
     * @deprecated Use {@link ChromeStart.setHelpMenuLinks} instead
     */
    setHelpMenuLinks(links: ChromeHelpMenuLink[]): void;
    /** @internal */
    getLeft$(): Observable<ChromeNavControl[]>;
    /** @internal */
    getRight$(): Observable<ChromeNavControl[]>;
    /** @internal */
    getCenter$(): Observable<ChromeNavControl[]>;
    /** @internal */
    getHelpMenuLinks$(): Observable<ChromeHelpMenuLink[]>;
}

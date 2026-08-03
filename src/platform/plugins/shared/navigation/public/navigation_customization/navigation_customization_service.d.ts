import type { CoreStart } from '@kbn/core/public';
import type { SolutionId } from '@kbn/core-chrome-browser';
import type { InternalChromeStart } from '@kbn/core-chrome-browser-internal';
import type { SecurityPluginStart } from '@kbn/security-plugin/public';
export interface NavigationCustomizationServiceStartDeps {
    core: CoreStart;
    chrome: InternalChromeStart;
    isUnauthenticated: boolean;
}
export interface NavigationCustomizationServiceUiDeps {
    core: CoreStart;
    chrome: InternalChromeStart;
    security?: SecurityPluginStart;
    solution?: SolutionId;
}
/**
 * Owns all navigation-customization concerns: stored-customization sync,
 * chrome handler registration, and user-menu link rendering.
 *
 * Both `handlerRegistered` and `menuLinkAdded` are tracked independently so
 * callers can invoke `enableUi` from different code paths (stateful handler
 * registration is synchronous; menu-link registration is async after the
 * active space resolves) without double-registering either capability.
 *
 * This file has no React or JSX. All UI is delegated to
 * `@kbn/navigation-customization-components` via dynamic imports.
 */
export declare class NavigationCustomizationService {
    private readonly stop$;
    private readonly reporter;
    private handlerRegistered;
    private menuLinkAdded;
    /**
     * Applies the stored customization to the project navigation. Must be called
     * once per plugin lifecycle; skips if the user is unauthenticated.
     *
     * The stored value is seeded synchronously via `peek()` so the navigation has
     * the customization applied on first paint. The `get$()` subscription then
     * keeps it in sync with later updates (in-tab saves and multi-tab sync).
     */
    start({ core, chrome, isUnauthenticated }: NavigationCustomizationServiceStartDeps): void;
    /**
     * Enables the customization UI. Each capability is independently idempotent:
     *
     * - Chrome handler: registered on the first call regardless of whether
     *   `security` is provided. Safe to call synchronously (before the active
     *   space is confirmed) because the handler is looked up lazily by chrome
     *   when the user actually clicks the customize button.
     *
     * - User-menu link: added the first time `security` is provided. In
     *   stateful mode this happens after the active space has confirmed a
     *   project-nav solution; in serverless mode it happens inside
     *   `navigation.initNavigation()`, once the solution ID is known.
     */
    enableUi({ core, chrome, security, solution }: NavigationCustomizationServiceUiDeps): void;
    stop(): void;
    private openModal;
    private getNavigationItems;
}

import type { CoreStart, CoreSetup } from '@kbn/core/public';
export interface ForwardDefinition {
    legacyAppId: string;
    newAppId: string;
    rewritePath: (legacyPath: string) => string;
}
export declare class UrlForwardingPlugin {
    private forwardDefinitions;
    setup(core: CoreSetup<{}, UrlForwardingStart>): {
        /**
         * Forwards URLs within the legacy `kibana` app to a new platform application.
         *
         * @param legacyAppId The name of the old app to forward URLs from
         * @param newAppId The name of the new app that handles the URLs now
         * @param rewritePath Function to rewrite the legacy sub path of the app to the new path in the core app.
         *        If none is provided, it will just strip the prefix of the legacyAppId away
         *
         * path into the new path
         *
         * Example usage:
         * ```
         * urlForwarding.forwardApp(
         *   'old',
         *   'new',
         *   path => {
         *     const [, id] = /old/item\/(.*)$/.exec(path) || [];
         *     if (!id) {
         *       return '#/home';
         *     }
         *     return '#/items/${id}';
         *  }
         * );
         * ```
         * This will cause the following redirects:
         *
         * * app/kibana#/old/ -> app/new#/home
         * * app/kibana#/old/item/123 -> app/new#/items/123
         *
         */
        forwardApp: (legacyAppId: string, newAppId: string, rewritePath?: (legacyPath: string) => string) => void;
    };
    start({ application, http: { basePath } }: CoreStart): {
        /**
         * Resolves the provided hash using the registered forwards and navigates to the target app.
         * If a navigation happened, `{ navigated: true }` will be returned.
         * If no matching forward is found, `{ navigated: false }` will be returned.
         * @param hash
         */
        navigateToLegacyKibanaUrl: (hash: string) => {
            navigated: boolean;
        };
        /**
         * @deprecated
         * Just exported for wiring up with legacy platform, should not be used.
         */
        getForwards: () => ForwardDefinition[];
    };
}
export type UrlForwardingSetup = ReturnType<UrlForwardingPlugin['setup']>;
export type UrlForwardingStart = ReturnType<UrlForwardingPlugin['start']>;

import type { NavigateToAppFn, LocatorClient } from '@kbn/shared-ux-prompt-no-data-views-types';
export interface UseOnTryEsqlParams {
    locatorClient?: LocatorClient;
    navigateToApp: NavigateToAppFn;
}
export declare const useOnTryESQL: ({ locatorClient, navigateToApp }: UseOnTryEsqlParams) => (() => void) | undefined;

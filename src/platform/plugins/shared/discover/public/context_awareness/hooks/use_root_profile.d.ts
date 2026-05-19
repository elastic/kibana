import type { Profile } from '../types';
/**
 * The root profile state
 */
export type RootProfileState = {
    rootProfileLoading: true;
} | {
    rootProfileLoading: false;
    getDefaultAdHocDataViews: Profile['getDefaultAdHocDataViews'];
    getDefaultEsqlQuery: Profile['getDefaultEsqlQuery'];
};
/**
 * Hook to trigger and wait for root profile resolution
 * @param options Options object
 * @returns The root profile state
 */
export declare const useRootProfile: () => RootProfileState;

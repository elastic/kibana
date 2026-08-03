/**
 * Hook to retrieve and initialize the default profile ad hoc data views
 * @param Options The options object
 * @returns An object containing the initialization function
 */
export declare const useDefaultAdHocDataViews: () => {
    initializeProfileDataViews: (rootProfileState: {
        rootProfileLoading: false;
        getDefaultAdHocDataViews: import("..").Profile["getDefaultAdHocDataViews"];
        getDefaultEsqlQuery: import("..").Profile["getDefaultEsqlQuery"];
    }) => Promise<void>;
};

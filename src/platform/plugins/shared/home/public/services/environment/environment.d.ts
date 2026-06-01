/** @public */
export interface Environment {
    /**
     * Flag whether the home app should advertise cloud features
     */
    readonly cloud: boolean;
    /**
     * Flag whether the home app should advertise apm features
     */
    readonly apmUi: boolean;
    /**
     * Flag whether the home app should advertise ml features
     */
    readonly ml: boolean;
}
export declare class EnvironmentService {
    private environment;
    setup(): {
        /**
         * Update the environment to influence how the home app is presenting available features.
         * This API should not be extended for new features and will be removed in future versions
         * in favor of display specific extension apis.
         * @deprecated
         * @removeBy 8.8.0
         * @param update
         */
        update: (update: Partial<Environment>) => void;
    };
    getEnvironment(): {
        cloud: boolean;
        apmUi: boolean;
        ml: boolean;
    };
}
export type EnvironmentServiceSetup = ReturnType<EnvironmentService['setup']>;

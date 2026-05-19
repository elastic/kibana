import type { UiSettingsParams } from '@kbn/core/server';
export declare const dataTiersUiSettingsConfig: Record<string, UiSettingsParams>;
export declare const cacheMaxAge: {
    'data_views:cache_max_age': {
        name: string;
        value: number;
        description: string;
        schema: import("@kbn/config-schema").Type<number>;
    };
};

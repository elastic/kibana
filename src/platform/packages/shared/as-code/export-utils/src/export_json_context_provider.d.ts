import React from 'react';
import type { CoreStart } from '@kbn/core/public';
import { type SharePluginStart } from '@kbn/share-plugin/public';
interface Context {
    services: {
        share?: SharePluginStart;
        core: CoreStart;
    };
}
export declare const ExportJsonFlyoutContext: React.Context<Context | undefined>;
export declare const useExportJsonFlyoutContext: () => Context;
export {};

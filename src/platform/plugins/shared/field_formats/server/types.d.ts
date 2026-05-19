import type { IUiSettingsClient } from '@kbn/core/server';
import type { FieldFormatInstanceType, FieldFormatsRegistry } from '../common';
export interface FieldFormatsSetup {
    /**
     * Register a server side field formatter
     * @param fieldFormat {@link FieldFormatInstanceType}
     */
    register: (fieldFormat: FieldFormatInstanceType) => void;
}
export interface FieldFormatsStart {
    /**
     * Create a field format registry
     * @param uiSettings - {@link IUiSettingsClient}
     */
    fieldFormatServiceFactory: (uiSettings: IUiSettingsClient) => Promise<FieldFormatsRegistry>;
}

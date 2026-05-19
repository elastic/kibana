import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
export declare const getMaxAllowedSampleSize: (uiSettings: IUiSettingsClient) => number;
export declare const getAllowedSampleSize: (customSampleSize: number | undefined, uiSettings: IUiSettingsClient) => number;

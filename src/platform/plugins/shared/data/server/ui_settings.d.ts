import type { DocLinksServiceSetup, UiSettingsParams } from '@kbn/core/server';
export declare function getUiSettings(docLinks: DocLinksServiceSetup, enableValidations: boolean): Record<string, UiSettingsParams<unknown>>;

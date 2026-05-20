import type { DocLinksServiceSetup, UiSettingsParams } from '@kbn/core/server';
export declare const getUiSettings: (docLinks: DocLinksServiceSetup, enableValidations: boolean) => Record<string, UiSettingsParams>;

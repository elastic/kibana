import * as i18n from '../core';
export declare type I18nServiceType = ReturnType<I18nProvider['$get']>;
export declare class I18nProvider implements angular.IServiceProvider {
    addTranslation: typeof i18n.addTranslation;
    getTranslation: typeof i18n.getTranslation;
    setLocale: typeof i18n.setLocale;
    getLocale: typeof i18n.getLocale;
    setDefaultLocale: typeof i18n.setDefaultLocale;
    getDefaultLocale: typeof i18n.getDefaultLocale;
    setFormats: typeof i18n.setFormats;
    getFormats: typeof i18n.getFormats;
    getRegisteredLocales: typeof i18n.getRegisteredLocales;
    init: typeof i18n.init;
    load: typeof i18n.load;
    $get: () => typeof i18n.translate;
}
//# sourceMappingURL=provider.d.ts.map
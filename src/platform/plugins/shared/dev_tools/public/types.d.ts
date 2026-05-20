import type { AnalyticsServiceStart, I18nStart, ThemeServiceStart, UserProfileService } from '@kbn/core/public';
export interface ConfigSchema {
    deeplinks: {
        navLinkStatus: 'default' | 'visible';
    };
}
export interface DevToolsStartServices {
    analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
    i18n: I18nStart;
    theme: Pick<ThemeServiceStart, 'theme$'>;
    userProfile: UserProfileService;
}

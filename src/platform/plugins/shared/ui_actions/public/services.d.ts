import type { AnalyticsServiceStart, I18nStart, ThemeServiceSetup, UserProfileService } from '@kbn/core/public';
export declare const getAnalytics: import("@kbn/kibana-utils-plugin/common").Get<AnalyticsServiceStart>, setAnalytics: import("@kbn/kibana-utils-plugin/common").Set<AnalyticsServiceStart>;
export declare const getI18n: import("@kbn/kibana-utils-plugin/common").Get<I18nStart>, setI18n: import("@kbn/kibana-utils-plugin/common").Set<I18nStart>;
export declare const getNotifications: import("@kbn/kibana-utils-plugin/common").Get<import("@kbn/core/public").NotificationsStart>, setNotifications: import("@kbn/kibana-utils-plugin/common").Set<import("@kbn/core/public").NotificationsStart>;
export declare const getTheme: import("@kbn/kibana-utils-plugin/common").Get<ThemeServiceSetup>, setTheme: import("@kbn/kibana-utils-plugin/common").Set<ThemeServiceSetup>;
export declare const getUserProfile: import("@kbn/kibana-utils-plugin/common").Get<UserProfileService>, setUserProfile: import("@kbn/kibana-utils-plugin/common").Set<UserProfileService>;

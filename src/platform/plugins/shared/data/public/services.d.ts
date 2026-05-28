import type { DataViewsContract } from '@kbn/data-views-plugin/common';
export declare const getUiSettings: import("@kbn/kibana-utils-plugin/public").Get<import("@kbn/core/public").IUiSettingsClient>, setUiSettings: import("@kbn/kibana-utils-plugin/public").Set<import("@kbn/core/public").IUiSettingsClient>;
export declare const getOverlays: import("@kbn/kibana-utils-plugin/public").Get<import("@kbn/core/public").OverlayStart>, setOverlays: import("@kbn/kibana-utils-plugin/public").Set<import("@kbn/core/public").OverlayStart>;
export declare const getIndexPatterns: import("@kbn/kibana-utils-plugin/public").Get<DataViewsContract>, setIndexPatterns: import("@kbn/kibana-utils-plugin/public").Set<DataViewsContract>;
export declare const getHttp: import("@kbn/kibana-utils-plugin/public").Get<import("@kbn/core/public").HttpSetup>, setHttp: import("@kbn/kibana-utils-plugin/public").Set<import("@kbn/core/public").HttpSetup>;
export declare const getSearchService: import("@kbn/kibana-utils-plugin/public").Get<import("./search").ISearchStart>, setSearchService: import("@kbn/kibana-utils-plugin/public").Set<import("./search").ISearchStart>;
export declare const getTheme: import("@kbn/kibana-utils-plugin/public").Get<import("@kbn/core/public").ThemeServiceSetup>, setTheme: import("@kbn/kibana-utils-plugin/public").Set<import("@kbn/core/public").ThemeServiceSetup>;

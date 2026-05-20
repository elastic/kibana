import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import type { DataView } from '@kbn/data-views-plugin/common';
export declare function isFieldStatsMode(savedSearch: SavedSearch, dataView: DataView | undefined, uiSettings: IUiSettingsClient): boolean;

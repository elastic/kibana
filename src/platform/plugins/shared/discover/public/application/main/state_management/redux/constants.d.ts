import type { TabItem } from '@kbn/unified-tabs';
import { type TabState } from './types';
export declare const DEFAULT_EXPANDED_DOC_OWNER = "discover_main_grid";
export declare const DEFAULT_TAB_STATE: Omit<TabState, keyof TabItem>;

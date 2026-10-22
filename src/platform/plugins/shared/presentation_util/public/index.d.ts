import { PresentationUtilPlugin } from './plugin';
export type { PresentationUtilPluginSetup, PresentationUtilPluginStart } from './types';
export type { DashboardSavingOption, SaveModalDashboardProps } from './components/types';
export { LazyDashboardPicker, SavedObjectSaveModalDashboard, withSuspense, LazyDataViewPicker, LazyFieldPicker, } from './components';
export declare function plugin(): PresentationUtilPlugin;

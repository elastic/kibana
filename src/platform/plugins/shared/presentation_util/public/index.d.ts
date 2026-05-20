import type { PresentationUtilPlugin } from './plugin';
export type { PresentationLabsService } from './services/presentation_labs_service';
export type { PresentationUtilPluginSetup, PresentationUtilPluginStart } from './types';
export type { DashboardSavingOption, SaveModalDashboardProps } from './components/types';
export { LazyLabsBeakerButton, LazyLabsFlyout, LazyDashboardPicker, SavedObjectSaveModalDashboard, withSuspense, LazyDataViewPicker, LazyFieldPicker, } from './components';
export declare function plugin(): PresentationUtilPlugin;

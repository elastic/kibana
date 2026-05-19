import { SavedObjectsPublicPlugin } from './plugin';
export type { OnSaveProps, OriginSaveModalProps, SaveModalState, SaveResult } from './save_modal';
export { SavedObjectSaveModal, SavedObjectSaveModalWithSaveResult, SavedObjectSaveModalOrigin, showSaveModal, type ShowSaveModalMinimalSaveModalProps, } from './save_modal';
export { isErrorNonFatal } from './saved_object';
export type { SavedObjectSaveOpts, SavedObject, SavedObjectConfig } from './types';
export declare const plugin: () => SavedObjectsPublicPlugin;

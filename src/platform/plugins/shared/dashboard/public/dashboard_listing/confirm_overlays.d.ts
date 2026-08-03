import type { ViewMode } from '@kbn/presentation-publishing';
export type DiscardOrKeepSelection = 'cancel' | 'discard' | 'keep';
export declare const confirmDiscardUnsavedChanges: (discardCallback: () => void, viewMode?: ViewMode) => void;
export declare const confirmCreateWithUnsaved: (startBlankCallback: () => void, continueCallback: () => void) => void;

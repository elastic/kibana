import type { DiscoverSessionTab, SavedSearchByValueAttributes } from '@kbn/saved-search-plugin/common';
import type { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import type { ApplicationStart } from '@kbn/core/public';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { SearchEmbeddableByReferenceState } from '../../common/embeddable/types';
export interface DiscoverSessionByValueInput {
    discoverSessionTab: DiscoverSessionTab | undefined;
    dashboardControlGroupState: ControlPanelsState<OptionsListESQLControlState> | undefined;
}
/**
 * Specifies the action to be taken for navigating back to an editor.
 */
export declare enum TransferAction {
    /**
     * A Cancel operation. Returns to the editor without modifying the original state.
     */
    Cancel = 0,
    /**
     * A Save Session operation. Updates the saved session and doesn't pass back any serialised state.
     */
    SaveSession = 1,
    /**
     * A Save By Value operation. Sends the serialised embeddable attributes to the editor.
     */
    SaveByValue = 2,
    /**
     * A Save By Reference operation. Sends a saved object reference to the editor.
     */
    SaveByReference = 3
}
interface TransferOptionsBase {
    path?: string;
    app?: string;
    newPanel?: boolean;
}
interface ByValueTransferOptions extends TransferOptionsBase {
    state: {
        byValueState: SavedSearchByValueAttributes;
        controlGroupState: ControlPanelsState<OptionsListESQLControlState> | undefined;
    };
}
interface ByReferenceTransferOptions extends TransferOptionsBase {
    state: SearchEmbeddableByReferenceState;
}
export declare class EmbeddableEditorService {
    private embeddableStateTransfer;
    private application;
    private embeddableState?;
    constructor(embeddableStateTransfer: EmbeddableStateTransfer, application: ApplicationStart);
    canSaveToDashboard: () => boolean;
    isByValueEditor: () => boolean;
    isEmbeddedEditor: () => boolean;
    getByValueTab: () => DiscoverSessionTab | undefined;
    /**
     * Resets the embeddable transfer state, ensuring it is cleared in storage and then dropped in memory.
     */
    clearEditorState: () => void;
    transferBackToEditor(action: TransferAction.Cancel | TransferAction.SaveSession): void;
    transferBackToEditor(action: TransferAction.SaveByValue, options: ByValueTransferOptions): void;
    transferBackToEditor(action: TransferAction.SaveByReference, options: ByReferenceTransferOptions): void;
    private getSerializedState;
    private getByValueInput;
}
export {};

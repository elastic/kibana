import type { OptionsListDSLControlState } from '@kbn/controls-schemas';
import type { StateComparators } from '@kbn/presentation-publishing/state_manager';
export type EditorState = Pick<OptionsListDSLControlState, 'search_technique' | 'single_select' | 'run_past_timeout'>;
export declare const editorComparators: StateComparators<EditorState>;
export declare const initializeEditorStateManager: (initialState: EditorState) => import("@kbn/presentation-publishing/state_manager/types").StateManager<EditorState>;

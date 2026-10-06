import type { PainlessContext, PainlessAutocompleteField } from '../types';
export interface EditorState {
    context: PainlessContext;
    fields?: PainlessAutocompleteField[];
}
export declare class EditorStateService {
    context: PainlessContext;
    fields: PainlessAutocompleteField[];
    getState(): EditorState;
    setup(context: PainlessContext, fields?: PainlessAutocompleteField[]): void;
}

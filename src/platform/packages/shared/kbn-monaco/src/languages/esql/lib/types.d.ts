import type { monaco } from '../../../monaco_imports';
export type MonacoAutocompleteCommandDefinition = Pick<monaco.languages.CompletionItem, 'label' | 'insertText' | 'filterText' | 'kind' | 'detail' | 'documentation' | 'sortText' | 'insertTextRules' | 'command'> & {
    range?: monaco.IRange;
};
export type MonacoCodeAction = monaco.languages.CodeAction;

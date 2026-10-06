import type { CompleteLangModuleType } from '../../types';
export { ID as PAINLESS_LANG_ID } from './constants';
export declare const PainlessLang: CompleteLangModuleType;
export { EditorStateService } from './lib';
export type { EditorState } from './lib';
export { PainlessCompletionAdapter } from './completion_adapter';
export type { Language } from './lexer_rules/painless';
export type * from './types';

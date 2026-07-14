import type { monaco } from '../../../../monaco_imports';
/**
 * Rewrites string-entry rules so that `next: '@string'` points to a nested
 * state instead, avoiding conflicts with the Console JSON `@string` state.
 *
 * The function narrows `IMonarchLanguageAction` through runtime checks so that
 * the returned rules are fully typed without assertions or wide types.
 */
export declare const remapStringsToNestedState: (rules: monaco.languages.IMonarchLanguageRule[] | undefined, nestedState: string) => monaco.languages.IMonarchLanguageRule[];

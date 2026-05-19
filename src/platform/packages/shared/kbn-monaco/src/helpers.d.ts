import { monaco } from './monaco_imports';
import type { LangModuleType, CustomLangModuleType } from './types';
export declare function registerLanguage(language: LangModuleType | CustomLangModuleType, force?: boolean): void;
/**
 *
 * @deprecated avoid using this function, use `monaco.editor.registerLanguageThemeDefinition` instead
 */
export declare function registerTheme(id: string, themeData: monaco.editor.IStandaloneThemeData): void;

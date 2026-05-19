import type { monaco } from '../../monaco_imports';
import { ConsoleParsedRequestsProvider } from './console_parsed_requests_provider';
import type { LangModuleType } from '../../types';
export declare const CONSOLE_TRIGGER_CHARS: string[];
/**
 * @description This language definition is used for the console input panel
 */
export declare const ConsoleLang: LangModuleType;
/**
 * @description This language definition is used for the console output panel
 */
export declare const ConsoleOutputLang: LangModuleType;
export declare const CONSOLE_THEME_ID: "console";
export declare const CONSOLE_OUTPUT_THEME_ID: "console";
export declare const getParsedRequestsProvider: (model: monaco.editor.ITextModel | null) => ConsoleParsedRequestsProvider;

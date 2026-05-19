import type { CustomLangModuleType } from '../../types';
import { ESQL_AUTOCOMPLETE_TRIGGER_CHARS } from './lib/providers';
import type { ESQLDependencies, MonacoMessage } from './lib/providers';
export { ESQL_AUTOCOMPLETE_TRIGGER_CHARS };
export type { ESQLDependencies, MonacoMessage };
export declare const ESQLLang: CustomLangModuleType<ESQLDependencies, MonacoMessage>;

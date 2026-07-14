import { type MonacoYamlOptions } from 'monaco-yaml';
import type { LangModuleType } from '../../types';
export { ID as YAML_LANG_ID } from './constants';
export declare const YamlLang: LangModuleType;
export declare const configureMonacoYamlSchema: (schemas: MonacoYamlOptions["schemas"], options?: Partial<MonacoYamlOptions>) => Promise<import("monaco-yaml").MonacoYaml>;

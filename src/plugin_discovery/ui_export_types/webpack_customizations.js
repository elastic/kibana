import { concat, merge } from './reduce';
import { alias, wrap, uniqueKeys } from './modify_reduce';

export const noParse = wrap(alias('webpackNoParseRules'), concat);
export const __globalImportAliases__ = wrap(alias('webpackAliases'), uniqueKeys('__globalImportAliases__'), merge);

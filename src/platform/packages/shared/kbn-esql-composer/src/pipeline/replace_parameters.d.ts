import type { ESQLAstQueryExpression } from '@elastic/esql/types';
import type { Params } from '../types';
/**
 * @deprecated Migrate to `@kbn/esql-language` composer.
 */
export declare function replaceParameters(queryAst: ESQLAstQueryExpression, params?: Params): void;

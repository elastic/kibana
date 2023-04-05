/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

import { Handlebars } from './src/handlebars';
import { allowUnsafeEval } from './src/utils';

// The handlebars module uses `export =`, so it can't be re-exported using `export *`.
// However, because of Babel, we're not allowed to use `export =` ourselves.
// So we have to resort to using `exports default` even though eslint doesn't like it.
//
// eslint-disable-next-line import/no-default-export
export default Handlebars;

/**
 * If the `unsafe-eval` CSP is set, this string constant will be `compile`,
 * otherwise `compileAST`.
 *
 * This can be used to call the more optimized `compile` function in
 * environments that support it, or fall back to `compileAST` on environments
 * that don't.
 */
export const compileFnName: 'compile' | 'compileAST' = allowUnsafeEval() ? 'compile' : 'compileAST';

export type {
  CompileOptions,
  RuntimeOptions,
  HelperDelegate,
  TemplateDelegate,
  DecoratorDelegate,
  HelperOptions,
} from './src/types';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TestProject } from '../integration_helpers';

describe('summarizePackage()', () => {
  describe('basic example', () => {
    const project = new TestProject({
      'index.ts': `
        export * from './foo'
        export * from './bar'
        export * from './baz'
        import * as Helpers from './helpers'
        export { Helpers }
      `,
      'foo.ts': `
        export function foo(name: string) {
          return \`hello $\{name}\`
        }
      `,
      'bar.ts': `
        interface Result {
          type: 'success'
        }
        export class Bar {
          doWork(): Result {
            return {
              type: 'success'
            }
          }
        }
      `,
      'baz.ts': `
        import { Bar } from './bar'
        import { foo } from './foo'

        export class Baz extends Bar {
          hello() {
            return foo('baz')
          }
        }
      `,
      'helpers.ts': `
        interface Result<K> {
          value: K
        }
        type A = 'a'
        export const a = (): A => 'a'
        export const b = (): Result<A> => ({ value: a() })
      `,
    });

    afterEach(async () => {
      await project.cleanup();
    });

    it('produces expected type summary', async () => {
      const { code, map, logs } = await project.runTypeSummarizer();

      expect(code).toMatchInlineSnapshot(`
        "
        declare type A = 'a';

        declare const a: () => A

        interface Result<K> {
            value: K;
        }

        declare const b: () => Result<A>

        declare namespace Helpers {
          export {
            a,
            b,
          }
        }
        export {Helpers}
        export declare function foo(name: string): string;

        interface Result_1 {
            type: 'success';
        }

        export declare class Bar {
            doWork(): Result_1;
        }

        export declare class Baz extends Bar {
            hello(): string;
        }

        "
      `);

      expect(map.snapshot).toMatchInlineSnapshot(`
        "from A @ 2:13
        to   A @ helpers.ts:4:5

        from a @ 4:14
        to   a @ helpers.ts:5:13

        from Result @ 6:10
        to   Result @ helpers.ts:1:10

        from value @ 7:4
        to   value @ helpers.ts:2:2

        from b @ 10:14
        to   b @ helpers.ts:6:13

        from Helpers @ 12:18
        to   interface @ helpers.ts:1:0

        from foo @ 19:24
        to   foo @ foo.ts:1:16

        from Result_1 @ 21:10
        to   Result @ bar.ts:1:10

        from type @ 22:4
        to   type @ bar.ts:2:2

        from Bar @ 25:21
        to   Bar @ bar.ts:4:13

        from doWork @ 26:4
        to   doWork @ bar.ts:5:2

        from Baz @ 29:21
        to   Baz @ baz.ts:4:13

        from hello @ 30:4
        to   hello @ baz.ts:5:2"
      `);

      expect(logs).toMatchInlineSnapshot(`
        "debg > load config -- packages/kbn-type-summarizer/__tmp__/src/tsconfig.json
        debg > create project -- packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts
        debg > create type checker
        debg > indexExports() -- packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts
            debg verbose steps:
                 resolveSymbol()x23
                 indexSymbolx12
        debg loaded sourcemaps for [
               'packages/kbn-type-summarizer/__tmp__/dist_dts/bar.d.ts',
               'packages/kbn-type-summarizer/__tmp__/dist_dts/baz.d.ts',
               'packages/kbn-type-summarizer/__tmp__/dist_dts/foo.d.ts',
               'packages/kbn-type-summarizer/__tmp__/dist_dts/helpers.d.ts',
               'packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts'
             ]
        debg > printImports() -- 0 imports
        debg > printLocals() -- 9 decs
            debg verbose steps:
                 resolveSymbol()x18
        "
      `);
    });
  });
});

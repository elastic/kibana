/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { run } from '../integration_helpers';

it('prints basic class correctly', async () => {
  const output = await run(`
    /**
     * Interface for writin records to a database
     */
    interface Db {
      write(record: Record<string, unknown>): Promise<void>
    }

    export class Foo {
      /**
       * The name of the Foo
       */
      public readonly name: string
      constructor(name: string) {
        this.name = name.toLowerCase()
      }

      speak() {
        alert('hi, my name is ' + this.name)
      }

      async save(db: Db) {
        await db.write({
          name: this.name
        })
      }
    }
  `);

  expect(output.code).toMatchInlineSnapshot(`
    "/**
     * Interface for writin records to a database
     */
    interface Db {
        write(record: Record<string, unknown>): Promise<void>;
    }
    export class Foo {
      /**
       * The name of the Foo
       */
      readonly name: string;
      constructor(name: string);
      speak(): void;
      save(db: Db): Promise<void>;
    }
    //# sourceMappingURL=index.d.ts.map"
  `);
  expect(output.map).toMatchInlineSnapshot(`
    Object {
      "file": "index.d.ts",
      "mappings": ";;;UAGU,E;;;aAIG,G;;;;WAIK,I;;EAKhB,K;EAIM,I",
      "names": Array [],
      "sourceRoot": "../../../src",
      "sources": Array [
        "index.ts",
      ],
      "version": 3,
    }
  `);
  expect(output.logs).toMatchInlineSnapshot(`
    "debug loaded sourcemaps for [ 'packages/kbn-type-summarizer/__tmp__/dist_dts/index.d.ts' ]
    debug Ignoring 1 global declarations for \\"Record\\"
    debug Ignoring 5 global declarations for \\"Promise\\"
    "
  `);
});

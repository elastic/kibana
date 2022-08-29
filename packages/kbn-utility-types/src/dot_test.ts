/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DedotObject, DotObject } from './dot';

interface TestA {
  'my.dotted.key': string;
  'my.dotted.partial.key'?: string;
  'ym.dotted.partial.key'?: string;
}

interface TestB {
  my: {
    undotted: {
      key: number;
    };
    partial?: {
      key: string;
    };
  };
  ym?: {
    partial: {
      key: string;
    };
  };
}

interface Dotted {
  'my.undotted.key': number;
  'my.partial.key'?: string;
  'ym.partial.key'?: string;
}

interface Dedotted {
  my: {
    dotted: {
      key: string;
      partial?: {
        key?: string;
      };
    };
  };
  ym?: {
    dotted?: {
      partial?: {
        key?: string;
      };
    };
  };
}

const dedotted1: DedotObject<TestA> = {} as Dedotted;

const dotted1: DotObject<TestB> = {} as Dotted;

const dedotted2: Dedotted = {} as DedotObject<TestA>;

const dotted2: Dotted = {} as DotObject<TestB>;

const foo: string | undefined = dedotted1.ym?.dotted?.partial?.key?.toString();

const bar: string = dotted1['my.undotted.key'].toString();

// @ts-expect-error
const baz: string = dotted1['my.partial.key'].toString();

const qux: string | undefined = dotted1['my.partial.key']?.toString();

// @ts-expect-error
const foo1: { baz: string } = {} as DedotObject<TestA>;

// @ts-expect-error
const foo2: { baz: string } = {} as DotObject<TestB>;

// @ts-expect-error
const foo3: { my: { dotted: { key: string }; partial: { key: number } } } =
  {} as DedotObject<TestA>;

interface ObjectWithArray {
  span: {
    links: Array<{
      trace: {
        id: string;
      };
      span: {
        id: string;
      };
    }>;
  };
}

const objectWithArray: DotObject<ObjectWithArray> = {
  'span.links.span.id': [''],
  'span.links.trace.id': [''],
};

// eslint-disable-next-line no-console
console.log({
  dotted1,
  dedotted1,
  dotted2,
  dedotted2,
  foo1,
  foo2,
  foo3,
  foo,
  bar,
  baz,
  qux,
  objectWithArray,
});

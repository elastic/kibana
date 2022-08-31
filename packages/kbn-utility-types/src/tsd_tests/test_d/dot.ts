/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expectAssignable, expectNotType, expectType } from 'tsd';
import { DedotObject, DotObject } from '../../dot';

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

const dedotted1 = {} as DedotObject<TestA>;

const dotted1 = {} as DotObject<TestB>;

expectAssignable<DedotObject<TestA>>({} as Dedotted);
expectAssignable<DotObject<TestB>>({} as Dotted);
expectAssignable<Dedotted>({} as DedotObject<TestA>);
expectAssignable<Dotted>({} as DotObject<TestB>);

expectType<string | undefined>(dedotted1.ym?.dotted?.partial?.key?.toString());
expectType<string>(dotted1['my.undotted.key'].toString());
expectNotType<string>(dotted1['my.partial.key']);
expectType<string | undefined>(dotted1['my.partial.key']?.toString());
expectNotType<{ baz: string }>({} as DedotObject<TestA>);
expectNotType<{ baz: string }>({} as DotObject<TestB>);
expectNotType<{ my: { dotted: { key: string }; partial: { key: number } } }>(
  {} as DedotObject<TestA>
);

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

expectType<DotObject<ObjectWithArray>>({
  'span.links.span.id': [''],
  'span.links.trace.id': [''],
});

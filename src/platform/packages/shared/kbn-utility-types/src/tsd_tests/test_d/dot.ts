/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DedotObject, DotObject } from '../../dot';

function isAssignable<T>(t: T) {}

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

isAssignable<DedotObject<TestA>>({} as Dedotted);

isAssignable<DotObject<TestB>>({} as Dotted);
isAssignable<Dedotted>({} as DedotObject<TestA>);
isAssignable<Dotted>({} as DotObject<TestB>);

isAssignable<string | undefined>(dedotted1.ym?.dotted?.partial?.key);

isAssignable<string>(dotted1['my.undotted.key'].toString());
// @ts-expect-error
isAssignable<string>(dotted1['my.partial.key']);

isAssignable<string | undefined>(dotted1['my.partial.key']?.toString());

// @ts-expect-error
isAssignable<{ baz: string }>({} as DedotObject<TestA>);
// @ts-expect-error
isAssignable<{ baz: string }>({} as DotObject<TestB>);

// @ts-expect-error
isAssignable<{ my: { dotted: { key: string }; partial: { key: number } } }, DedotObject<TestA>>();

type WithStringKey = {
  [x: string]: string;
} & {
  count: number;
};

type WithStringKeyDedotted = DedotObject<WithStringKey>;

isAssignable<WithStringKeyDedotted>({} as WithStringKey);

isAssignable<WithStringKey>({} as WithStringKeyDedotted);

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

isAssignable<DotObject<ObjectWithArray>>({
  'span.links.span.id': [''],
  'span.links.trace.id': [''],
});

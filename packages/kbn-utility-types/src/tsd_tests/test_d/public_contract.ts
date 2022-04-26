/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expectType } from 'tsd';
import { PublicContract } from '../..';

class Test {
  public str: string = '';
  // @ts-ignore
  private num: number = 0;
}

type CONTRACT = PublicContract<Test>;

expectType<CONTRACT>({
  str: 'foo',
});

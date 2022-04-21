/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expectAssignable, expectNotAssignable } from 'tsd';
import { PublicMethodsOf } from '../..';

class Test {
  public name: string = '';
  getName() {
    return this.name;
  }
  // @ts-ignore
  private getDoubleName() {
    return this.name.repeat(2);
  }
}

expectAssignable<PublicMethodsOf<Test>>({
  getName() {
    return '';
  },
});

expectNotAssignable<PublicMethodsOf<Test>>({
  getName() {
    return 1;
  },
});

expectNotAssignable<PublicMethodsOf<Test>>({
  getDoubleName() {
    return 1;
  },
});

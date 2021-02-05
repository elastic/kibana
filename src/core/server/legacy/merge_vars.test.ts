/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { mergeVars } from './merge_vars';

describe('mergeVars', () => {
  it('merges two objects together', () => {
    const first = {
      otherName: 'value',
      otherCanFoo: true,
      otherNested: {
        otherAnotherVariable: 'ok',
      },
    };
    const second = {
      name: 'value',
      canFoo: true,
      nested: {
        anotherVariable: 'ok',
      },
    };

    expect(mergeVars(first, second)).toEqual({
      name: 'value',
      canFoo: true,
      nested: {
        anotherVariable: 'ok',
      },
      otherName: 'value',
      otherCanFoo: true,
      otherNested: {
        otherAnotherVariable: 'ok',
      },
    });
  });

  it('does not mutate the source objects', () => {
    const first = {
      var1: 'first',
    };
    const second = {
      var1: 'second',
      var2: 'second',
    };
    const third = {
      var1: 'third',
      var2: 'third',
      var3: 'third',
    };
    const fourth = {
      var1: 'fourth',
      var2: 'fourth',
      var3: 'fourth',
      var4: 'fourth',
    };

    mergeVars(first, second, third, fourth);

    expect(first).toEqual({ var1: 'first' });
    expect(second).toEqual({ var1: 'second', var2: 'second' });
    expect(third).toEqual({ var1: 'third', var2: 'third', var3: 'third' });
    expect(fourth).toEqual({ var1: 'fourth', var2: 'fourth', var3: 'fourth', var4: 'fourth' });
  });

  it('merges multiple objects together with precedence increasing from left-to-right', () => {
    const first = {
      var1: 'first',
      var2: 'first',
      var3: 'first',
      var4: 'first',
    };
    const second = {
      var1: 'second',
      var2: 'second',
      var3: 'second',
    };
    const third = {
      var1: 'third',
      var2: 'third',
    };
    const fourth = {
      var1: 'fourth',
    };

    expect(mergeVars(first, second, third, fourth)).toEqual({
      var1: 'fourth',
      var2: 'third',
      var3: 'second',
      var4: 'first',
    });
  });

  it('overwrites the original variable value if a duplicate entry is found', () => {
    const first = {
      nested: {
        otherAnotherVariable: 'ok',
      },
    };
    const second = {
      name: 'value',
      canFoo: true,
      nested: {
        anotherVariable: 'ok',
      },
    };

    expect(mergeVars(first, second)).toEqual({
      name: 'value',
      canFoo: true,
      nested: {
        anotherVariable: 'ok',
      },
    });
  });

  it('combines entries within "uiCapabilities"', () => {
    const first = {
      uiCapabilities: {
        firstCapability: 'ok',
        sharedCapability: 'shared',
      },
    };
    const second = {
      name: 'value',
      canFoo: true,
      uiCapabilities: {
        secondCapability: 'ok',
      },
    };
    const third = {
      name: 'value',
      canFoo: true,
      uiCapabilities: {
        thirdCapability: 'ok',
        sharedCapability: 'blocked',
      },
    };

    expect(mergeVars(first, second, third)).toEqual({
      name: 'value',
      canFoo: true,
      uiCapabilities: {
        firstCapability: 'ok',
        secondCapability: 'ok',
        thirdCapability: 'ok',
        sharedCapability: 'blocked',
      },
    });
  });

  it('does not deeply combine entries within "uiCapabilities"', () => {
    const first = {
      uiCapabilities: {
        firstCapability: 'ok',
        nestedCapability: {
          otherNestedProp: 'otherNestedValue',
        },
      },
    };
    const second = {
      name: 'value',
      canFoo: true,
      uiCapabilities: {
        secondCapability: 'ok',
        nestedCapability: {
          nestedProp: 'nestedValue',
        },
      },
    };

    expect(mergeVars(first, second)).toEqual({
      name: 'value',
      canFoo: true,
      uiCapabilities: {
        firstCapability: 'ok',
        secondCapability: 'ok',
        nestedCapability: {
          nestedProp: 'nestedValue',
        },
      },
    });
  });
});

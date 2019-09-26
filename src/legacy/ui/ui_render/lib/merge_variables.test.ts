/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { mergeVariables } from './merge_variables';

describe('mergeVariables', () => {
  it('merges two objects together', () => {
    const someVariables = {
      name: 'value',
      canFoo: true,
      nested: {
        anotherVariable: 'ok',
      },
    };

    const otherVariables = {
      otherName: 'value',
      otherCanFoo: true,
      otherNested: {
        otherAnotherVariable: 'ok',
      },
    };

    const result = mergeVariables(someVariables, otherVariables);

    expect(result).toEqual({
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
    const original = {
      var1: 'original',
    };

    const set1 = {
      var1: 'value1',
      var2: 'value1',
    };

    const set2 = {
      var1: 'value2',
      var2: 'value2',
      var3: 'value2',
    };

    const set3 = {
      var1: 'value3',
      var2: 'value3',
      var3: 'value3',
      var4: 'value3',
    };

    mergeVariables(original, set1, set2, set3);

    expect(original).toEqual({ var1: 'original' });
    expect(set1).toEqual({ var1: 'value1', var2: 'value1' });
    expect(set2).toEqual({ var1: 'value2', var2: 'value2', var3: 'value2' });
    expect(set3).toEqual({ var1: 'value3', var2: 'value3', var3: 'value3', var4: 'value3' });
  });

  it('merges multiple objects together, preferring the leftmost values', () => {
    const original = {
      var1: 'original',
    };

    const set1 = {
      var1: 'value1',
      var2: 'value1',
    };

    const set2 = {
      var1: 'value2',
      var2: 'value2',
      var3: 'value2',
    };

    const set3 = {
      var1: 'value3',
      var2: 'value3',
      var3: 'value3',
      var4: 'value3',
    };

    const result = mergeVariables(original, set1, set2, set3);

    expect(result).toEqual({
      var1: 'original',
      var2: 'value1',
      var3: 'value2',
      var4: 'value3',
    });
  });

  it('retains the original variable value if a duplicate entry is found', () => {
    const someVariables = {
      name: 'value',
      canFoo: true,
      nested: {
        anotherVariable: 'ok',
      },
    };

    const otherVariables = {
      nested: {
        otherAnotherVariable: 'ok',
      },
    };

    const result = mergeVariables(someVariables, otherVariables);
    expect(result).toEqual({
      name: 'value',
      canFoo: true,
      nested: {
        anotherVariable: 'ok',
      },
    });
  });

  it('combines entries within "uiCapabilities"', () => {
    const someVariables = {
      name: 'value',
      canFoo: true,
      uiCapabilities: {
        firstCapability: 'ok',
      },
    };

    const otherVariables = {
      uiCapabilities: {
        secondCapability: 'ok',
      },
    };

    const result = mergeVariables(someVariables, otherVariables);

    expect(result).toEqual({
      name: 'value',
      canFoo: true,
      uiCapabilities: {
        firstCapability: 'ok',
        secondCapability: 'ok',
      },
    });
  });

  it('does not deeply combine entries within "uiCapabilities"', () => {
    const someVariables = {
      name: 'value',
      canFoo: true,
      uiCapabilities: {
        firstCapability: 'ok',
        nestedCapability: {
          nestedProp: 'nestedValue',
        },
      },
    };

    const otherVariables = {
      uiCapabilities: {
        secondCapability: 'ok',
        nestedCapability: {
          otherNestedProp: 'otherNestedValue',
        },
      },
    };

    const result = mergeVariables(someVariables, otherVariables);
    expect(result).toEqual({
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { type Transform, TransformType } from './types';
import { transformComparator } from './utils';

describe('transformComparator', () => {
  const core1 = { version: '1.0.0', transformType: TransformType.Core } as Transform;
  const core5 = { version: '5.0.0', transformType: TransformType.Core } as Transform;
  const core6 = { version: '6.0.0', transformType: TransformType.Core } as Transform;
  const reference1 = { version: '1.0.0', transformType: TransformType.Reference } as Transform;
  const reference2 = { version: '2.0.0', transformType: TransformType.Reference } as Transform;
  const convert1 = { version: '1.0.0', transformType: TransformType.Convert } as Transform;
  const convert5 = { version: '5.0.0', transformType: TransformType.Convert } as Transform;
  const migrate1 = { version: '1.0.0', transformType: TransformType.Migrate } as Transform;
  const migrate2 = { version: '2.0.0', transformType: TransformType.Migrate } as Transform;
  const migrate5 = { version: '5.0.0', transformType: TransformType.Migrate } as Transform;

  it.each`
    transforms                                               | expected
    ${[migrate1, reference1, core1, convert1]}               | ${[core1, reference1, convert1, migrate1]}
    ${[reference1, migrate1, core1, core5, core6, convert1]} | ${[core1, core5, core6, reference1, convert1, migrate1]}
    ${[reference2, reference1, migrate1, core6, convert5]}   | ${[core6, reference1, migrate1, reference2, convert5]}
    ${[migrate5, convert5, core5, migrate2]}                 | ${[core5, migrate2, convert5, migrate5]}
  `('should sort transforms correctly', ({ transforms, expected }) => {
    expect(transforms.sort(transformComparator)).toEqual(expected);
  });
});

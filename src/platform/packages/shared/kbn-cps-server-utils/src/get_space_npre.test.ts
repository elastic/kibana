/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asSpaceId } from '@kbn/core-spaces-common';
import { getSpaceNPRE } from './get_space_npre';

describe('getSpaceNPRE', () => {
  it('returns the NPRE reference for a given space', () => {
    expect(getSpaceNPRE(asSpaceId('my-space'))).toBe('@kibana_space_my-space_default');
  });

  it('returns the NPRE reference for the default space', () => {
    expect(getSpaceNPRE(asSpaceId('default'))).toBe('@kibana_space_default_default');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';
import { numberToDuration } from './schema_utils';

describe('Schema Utils', () => {
  it('numberToDuration converts a number/Duration into a Duration object', () => {
    expect(numberToDuration(500)).toMatchInlineSnapshot(`"PT0.5S"`);
    expect(numberToDuration(moment.duration(1, 'hour'))).toMatchInlineSnapshot(`"PT1H"`);
  });
});

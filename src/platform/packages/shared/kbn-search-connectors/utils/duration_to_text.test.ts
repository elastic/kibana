/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment';

import { durationToText } from './duration_to_text';

describe('durationToText', () => {
  it('should correctly turn duration into text', () => {
    expect(durationToText(moment.duration(11005, 'seconds'))).toEqual('3h 3m 25s');
  });
  it('should correctly turn days into hours', () => {
    expect(durationToText(moment.duration(100980, 'seconds'))).toEqual('28h 3m 0s');
  });
  it('should return -- for undefined', () => {
    expect(durationToText(undefined)).toEqual('--');
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { SurrDocType } from '../services/context';
import { getHitsInIntervalRequestTitle } from './get_hits_in_interval_request_title';

describe('getHitsInIntervalRequestTitle', () => {
  const { uiSettings } = coreMock.createStart();
  // `x` formats as milliseconds since the Unix epoch, which doesn't depend on the timezone
  uiSettings.get.mockReturnValue('x');

  it('returns the time older documents are looked up before', () => {
    expect(getHitsInIntervalRequestTitle(SurrDocType.SUCCESSORS, 1000, uiSettings)).toBe(
      'Older documents (before 1000)'
    );
  });

  it('returns the time newer documents are looked up after', () => {
    expect(getHitsInIntervalRequestTitle(SurrDocType.PREDECESSORS, 1000, uiSettings)).toBe(
      'Newer documents (after 1000)'
    );
  });
});

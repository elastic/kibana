/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { replaceUrlHashQuery } from './format';

describe('format', () => {
  describe('replaceUrlHashQuery', () => {
    it('should add hash query to url without hash', () => {
      const url = 'http://localhost:5601/oxf/app/kibana';
      expect(replaceUrlHashQuery(url, () => ({ test: 'test' }))).toMatchInlineSnapshot(
        `"http://localhost:5601/oxf/app/kibana#?test=test"`
      );
    });

    it('should replace hash query', () => {
      const url = 'http://localhost:5601/oxf/app/kibana#?test=test';
      expect(
        replaceUrlHashQuery(url, (query) => ({
          ...query,
          test1: 'test1',
        }))
      ).toMatchInlineSnapshot(`"http://localhost:5601/oxf/app/kibana#?test=test&test1=test1"`);
    });
  });
});

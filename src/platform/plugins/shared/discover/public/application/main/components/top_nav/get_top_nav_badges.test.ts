/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTopNavBadges } from './get_top_nav_badges';

describe('getTopNavBadges()', function () {
  describe('managed discover session', () => {
    test('should return the managed badge when managed discover session', () => {
      const topNavBadges = getTopNavBadges({
        isManaged: true,
      });

      expect(topNavBadges).toHaveLength(1);
      expect(topNavBadges[0].badgeText).toEqual('Managed');
    });

    test('should not return the managed badge when not managed discover session', () => {
      const topNavBadges = getTopNavBadges({
        isManaged: false,
      });

      expect(topNavBadges).toHaveLength(0);
    });
  });
});

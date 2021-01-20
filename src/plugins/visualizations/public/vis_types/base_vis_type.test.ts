/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { BaseVisType } from './base_vis_type';

describe('BaseVisType', () => {
  describe('constructor', () => {
    test('should throw if image and icon are missing', () => {
      expect(() => {
        new BaseVisType({
          name: 'test',
          title: 'test',
          description: 'test',
          visualization: {} as any,
        });
      }).toThrow();
    });
  });
});

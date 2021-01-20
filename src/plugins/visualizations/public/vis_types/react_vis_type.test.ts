/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { cloneDeep } from 'lodash';
import { ReactVisType } from './react_vis_type';

describe('React Vis Type', () => {
  const visConfig = {
    name: 'test',
    title: 'test',
    description: 'test',
    icon: 'test',
    visConfig: { component: 'test' },
  };

  describe('initialization', () => {
    it('should throw if component is not set', () => {
      expect(() => {
        const missingConfig = cloneDeep(visConfig);
        // @ts-expect-error TS knows it's a required property
        delete missingConfig.visConfig.component;
        new ReactVisType(missingConfig);
      }).toThrow();
    });

    it('creates react controller', () => {
      const visType = new ReactVisType(visConfig);
      expect(visType.visualization).not.toBeUndefined();
    });
  });
});

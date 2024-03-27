/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { take } from 'rxjs';
import { NavControlsService } from './nav_controls_service';

describe('RecentlyAccessed#start()', () => {
  const getStart = () => {
    return new NavControlsService().start();
  };

  describe('left side', () => {
    it('allows registration', async () => {
      const navControls = getStart();
      const nc = { mount: jest.fn() };
      navControls.registerLeft(nc);
      expect(await navControls.getLeft$().pipe(take(1)).toPromise()).toEqual([nc]);
    });

    it('sorts controls by order property', async () => {
      const navControls = getStart();
      const nc1 = { mount: jest.fn(), order: 10 };
      const nc2 = { mount: jest.fn(), order: 0 };
      const nc3 = { mount: jest.fn(), order: 20 };
      navControls.registerLeft(nc1);
      navControls.registerLeft(nc2);
      navControls.registerLeft(nc3);
      expect(await navControls.getLeft$().pipe(take(1)).toPromise()).toEqual([nc2, nc1, nc3]);
    });
  });

  describe('right side', () => {
    it('allows registration', async () => {
      const navControls = getStart();
      const nc = { mount: jest.fn() };
      navControls.registerRight(nc);
      expect(await navControls.getRight$().pipe(take(1)).toPromise()).toEqual([nc]);
    });

    it('sorts controls by order property', async () => {
      const navControls = getStart();
      const nc1 = { mount: jest.fn(), order: 10 };
      const nc2 = { mount: jest.fn(), order: 0 };
      const nc3 = { mount: jest.fn(), order: 20 };
      navControls.registerRight(nc1);
      navControls.registerRight(nc2);
      navControls.registerRight(nc3);
      expect(await navControls.getRight$().pipe(take(1)).toPromise()).toEqual([nc2, nc1, nc3]);
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { take } from 'rxjs';
import { NavControlsService } from './nav_controls_service';

describe('NavControlsService#start()', () => {
  let navControls: ReturnType<NavControlsService['start']>;
  beforeEach(() => {
    navControls = new NavControlsService().start();
  });

  const testCases = [
    {
      name: 'left',
      register: 'registerLeft' as const,
      get$: 'getLeft$' as const,
    },
    {
      name: 'right',
      register: 'registerRight' as const,
      get$: 'getRight$' as const,
    },
    {
      name: 'center',
      register: 'registerCenter' as const,
      get$: 'getCenter$' as const,
    },
    {
      name: 'extension',
      register: 'registerExtension' as const,
      get$: 'getExtension$' as const,
    },
  ];

  it.each(testCases)('$name - allow registration', async ({ register, get$ }) => {
    const nc = { mount: jest.fn() };
    navControls[register](nc);
    expect(await navControls[get$]().pipe(take(1)).toPromise()).toEqual([nc]);
  });

  it.each(testCases)('$name allows unregistration', async ({ register, get$ }) => {
    const nc = { mount: jest.fn() };
    navControls[register](nc);
    expect(await navControls[get$]().pipe(take(1)).toPromise()).toEqual([nc]);
    navControls[`un${register}`](nc);
    expect(await navControls.getLeft$().pipe(take(1)).toPromise()).toEqual([]);
  });

  it.each(testCases)('$name - sorts controls by order property', async ({ register, get$ }) => {
    const nc1 = { mount: jest.fn(), order: 10 };
    const nc2 = { mount: jest.fn(), order: 0 };
    const nc3 = { mount: jest.fn(), order: 20 };
    navControls[register](nc1);
    navControls[register](nc2);
    navControls[register](nc3);
    expect(await navControls[get$]().pipe(take(1)).toPromise()).toEqual([nc2, nc1, nc3]);
  });
});

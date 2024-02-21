/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, lastValueFrom } from 'rxjs';
import { take, map, takeLast } from 'rxjs/operators';
import { type App, AppStatus } from '@kbn/core-application-browser';
import { NavLinksService } from './nav_links_service';

const availableApps: ReadonlyMap<string, App> = new Map([
  ['app1', { id: 'app1', order: 0, title: 'App 1', icon: 'app1', mount: () => () => undefined }],
  [
    'app2',
    {
      id: 'app2',
      order: -10,
      title: 'App 2',
      euiIconType: 'canvasApp',
      mount: () => () => undefined,
      deepLinks: [
        {
          id: 'deepApp1',
          order: 50,
          title: 'Deep App 1',
          path: '/deepapp1',
          visibleIn: ['sideNav'],
          deepLinks: [
            {
              id: 'deepApp2',
              order: 40,
              title: 'Deep App 2',
              path: '/deepapp2',
            },
          ],
        },
      ],
    },
  ],
  [
    'chromelessApp',
    {
      id: 'chromelessApp',
      order: 20,
      title: 'Chromless App',
      chromeless: true,
      mount: () => () => undefined,
    },
  ],
  [
    'inaccessibleApp', // inaccessible app
    {
      id: 'inaccessibleApp',
      order: 30,
      title: 'App inaccessible',
      mount: () => () => undefined,
      status: AppStatus.inaccessible,
      deepLinks: [
        {
          id: 'deepInaccessibleApp1',
          order: 50,
          title: 'Deep App 3',
          path: '/deepapp3',
          deepLinks: [
            {
              id: 'deepInaccessibleApp2',
              order: 40,
              title: 'Deep App 3',
              path: '/deepapp3',
            },
          ],
        },
      ],
    },
  ],
]);

const mockHttp = {
  basePath: {
    prepend: (url: string) => `wow${url}`,
  },
} as any;

describe('NavLinksService', () => {
  let service: NavLinksService;
  let mockAppService: any;
  let start: ReturnType<NavLinksService['start']>;

  beforeEach(() => {
    service = new NavLinksService();
    mockAppService = {
      applications$: new BehaviorSubject<ReadonlyMap<string, App>>(availableApps),
    };
    start = service.start({ application: mockAppService, http: mockHttp });
  });

  describe('#getNavLinks$()', () => {
    it('does not include `chromeless` applications', async () => {
      expect(
        await lastValueFrom(
          start.getNavLinks$().pipe(
            take(1),
            map((links) => links.map((l) => l.id))
          )
        )
      ).not.toContain('chromelessApp');
    });

    it('does not include `inaccesible` applications', async () => {
      expect(
        await lastValueFrom(
          start.getNavLinks$().pipe(
            take(1),
            map((links) => links.map((l) => l.id))
          )
        )
      ).not.toContain('inaccessibleApp');
    });

    it('sorts navlinks by `order` property', async () => {
      expect(
        await lastValueFrom(
          start.getNavLinks$().pipe(
            take(1),
            map((links) => links.map((l) => l.id))
          )
        )
      ).toEqual(['app2', 'app1', 'app2:deepApp2', 'app2:deepApp1']);
    });

    it('emits multiple values', async () => {
      const navLinkIds$ = start.getNavLinks$().pipe(map((links) => links.map((l) => l.id)));
      const emittedLinks: string[][] = [];
      navLinkIds$.subscribe((r) => emittedLinks.push(r));
      service.stop();
      expect(emittedLinks).toEqual([['app2', 'app1', 'app2:deepApp2', 'app2:deepApp1']]);
    });

    it('completes when service is stopped', async () => {
      const last$ = lastValueFrom(start.getNavLinks$().pipe(takeLast(1)));
      service.stop();
      await expect(last$).resolves.toBeInstanceOf(Array);
    });
  });

  describe('#get()', () => {
    it('returns link if exists', () => {
      expect(start.get('app2')!.title).toEqual('App 2');
    });

    it('returns undefined if it does not exist', () => {
      expect(start.get('phony')).toBeUndefined();
    });

    it('returns undefined if app is inaccessible', () => {
      expect(start.get('inaccessibleApp')).toBeUndefined();
    });
  });

  describe('#getAll()', () => {
    it('returns a sorted array of navlinks', () => {
      expect(start.getAll().map((l) => l.id)).toEqual([
        'app2',
        'app1',
        'app2:deepApp2',
        'app2:deepApp1',
      ]);
    });
  });

  describe('#has()', () => {
    it('returns true if exists', () => {
      expect(start.has('app2')).toBe(true);
    });

    it('returns false if it does not exist', () => {
      expect(start.has('phony')).toBe(false);
    });
  });

  describe('#enableForcedAppSwitcherNavigation()', () => {
    it('flips #getForceAppSwitcherNavigation$()', async () => {
      await expect(
        lastValueFrom(start.getForceAppSwitcherNavigation$().pipe(take(1)))
      ).resolves.toBe(false);

      start.enableForcedAppSwitcherNavigation();

      await expect(
        lastValueFrom(start.getForceAppSwitcherNavigation$().pipe(take(1)))
      ).resolves.toBe(true);
    });
  });
});

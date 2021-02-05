/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { NavLinksService } from './nav_links_service';
import { take, map, takeLast } from 'rxjs/operators';
import { App } from '../../application';
import { BehaviorSubject } from 'rxjs';

const availableApps = new Map([
  ['app1', { id: 'app1', order: 0, title: 'App 1', icon: 'app1' }],
  [
    'app2',
    {
      id: 'app2',
      order: -10,
      title: 'App 2',
      euiIconType: 'canvasApp',
    },
  ],
  ['chromelessApp', { id: 'chromelessApp', order: 20, title: 'Chromless App', chromeless: true }],
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
      applications$: new BehaviorSubject<ReadonlyMap<string, App>>(availableApps as any),
    };
    start = service.start({ application: mockAppService, http: mockHttp });
  });

  describe('#getNavLinks$()', () => {
    it('does not include `chromeless` applications', async () => {
      expect(
        await start
          .getNavLinks$()
          .pipe(
            take(1),
            map((links) => links.map((l) => l.id))
          )
          .toPromise()
      ).not.toContain('chromelessApp');
    });

    it('sorts navlinks by `order` property', async () => {
      expect(
        await start
          .getNavLinks$()
          .pipe(
            take(1),
            map((links) => links.map((l) => l.id))
          )
          .toPromise()
      ).toEqual(['app2', 'app1']);
    });

    it('emits multiple values', async () => {
      const navLinkIds$ = start.getNavLinks$().pipe(map((links) => links.map((l) => l.id)));
      const emittedLinks: string[][] = [];
      navLinkIds$.subscribe((r) => emittedLinks.push(r));
      start.update('app1', { href: '/foo' });

      service.stop();
      expect(emittedLinks).toEqual([
        ['app2', 'app1'],
        ['app2', 'app1'],
      ]);
    });

    it('completes when service is stopped', async () => {
      const last$ = start.getNavLinks$().pipe(takeLast(1)).toPromise();
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
  });

  describe('#getAll()', () => {
    it('returns a sorted array of navlinks', () => {
      expect(start.getAll().map((l) => l.id)).toEqual(['app2', 'app1']);
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

  describe('#showOnly()', () => {
    it('does nothing if link does not exist', async () => {
      start.showOnly('fake');
      expect(
        await start
          .getNavLinks$()
          .pipe(
            take(1),
            map((links) => links.map((l) => l.id))
          )
          .toPromise()
      ).toEqual(['app2', 'app1']);
    });

    it('does nothing on chromeless applications', async () => {
      start.showOnly('chromelessApp');
      expect(
        await start
          .getNavLinks$()
          .pipe(
            take(1),
            map((links) => links.map((l) => l.id))
          )
          .toPromise()
      ).toEqual(['app2', 'app1']);
    });

    it('removes all other links', async () => {
      start.showOnly('app2');
      expect(
        await start
          .getNavLinks$()
          .pipe(
            take(1),
            map((links) => links.map((l) => l.id))
          )
          .toPromise()
      ).toEqual(['app2']);
    });

    it('still removes all other links when availableApps are re-emitted', async () => {
      start.showOnly('app2');
      mockAppService.applications$.next(mockAppService.applications$.value);
      expect(
        await start
          .getNavLinks$()
          .pipe(
            take(1),
            map((links) => links.map((l) => l.id))
          )
          .toPromise()
      ).toEqual(['app2']);
    });
  });

  describe('#update()', () => {
    it('updates the navlinks and returns the updated link', async () => {
      expect(start.update('app2', { hidden: true })).toEqual(
        expect.objectContaining({
          hidden: true,
          id: 'app2',
          order: -10,
          title: 'App 2',
          euiIconType: 'canvasApp',
        })
      );
      const hiddenLinkIds = await start
        .getNavLinks$()
        .pipe(
          take(1),
          map((links) => links.filter((l) => l.hidden).map((l) => l.id))
        )
        .toPromise();
      expect(hiddenLinkIds).toEqual(['app2']);
    });

    it('returns undefined if link does not exist', () => {
      expect(start.update('fake', { hidden: true })).toBeUndefined();
    });

    it('keeps the updated link when availableApps are re-emitted', async () => {
      start.update('app2', { hidden: true });
      mockAppService.applications$.next(mockAppService.applications$.value);
      const hiddenLinkIds = await start
        .getNavLinks$()
        .pipe(
          take(1),
          map((links) => links.filter((l) => l.hidden).map((l) => l.id))
        )
        .toPromise();
      expect(hiddenLinkIds).toEqual(['app2']);
    });
  });

  describe('#enableForcedAppSwitcherNavigation()', () => {
    it('flips #getForceAppSwitcherNavigation$()', async () => {
      await expect(start.getForceAppSwitcherNavigation$().pipe(take(1)).toPromise()).resolves.toBe(
        false
      );

      start.enableForcedAppSwitcherNavigation();

      await expect(start.getForceAppSwitcherNavigation$().pipe(take(1)).toPromise()).resolves.toBe(
        true
      );
    });
  });
});

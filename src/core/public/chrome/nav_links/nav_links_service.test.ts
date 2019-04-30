/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { NavLinksService } from './nav_links_service';
import { take, map, takeLast } from 'rxjs/operators';

const mockAppService = {
  availableApps: [
    { id: 'app1', order: 0, title: 'App 1', icon: 'app1', rootRoute: '/app1' },
    { id: 'app2', order: -10, title: 'App 2', euiIconType: 'canvasApp', rootRoute: '/app2' },
    { id: 'legacyApp', order: 20, title: 'Legacy App', appUrl: '/legacy-app' },
  ],
} as any;

describe('NavLinksService', () => {
  describe('#getNavLinks$()', () => {
    it('sorts navlinks by `order` property', async () => {
      const start = new NavLinksService().start({ application: mockAppService });
      expect(
        await start
          .getNavLinks$()
          .pipe(
            take(1),
            map(links => links.map(l => l.id))
          )
          .toPromise()
      ).toEqual(['app2', 'app1', 'legacyApp']);
    });

    it('emits multiple values', async () => {
      const service = new NavLinksService();
      const start = service.start({ application: mockAppService });
      const navLinkIds$ = start.getNavLinks$().pipe(map(links => links.map(l => l.id)));
      const emittedLinks: string[][] = [];
      navLinkIds$.subscribe(r => emittedLinks.push(r));
      start.update('app1', { active: true });

      service.stop();
      expect(emittedLinks).toEqual([['app2', 'app1', 'legacyApp'], ['app2', 'app1', 'legacyApp']]);
    });

    it('completes when service is stopped', async () => {
      const service = new NavLinksService();
      const start = service.start({ application: mockAppService });
      const last$ = start
        .getNavLinks$()
        .pipe(takeLast(1))
        .toPromise();
      service.stop();
      await expect(last$).resolves.toBeInstanceOf(Array);
    });
  });

  describe('#get()', () => {
    it('returns link if exists', () => {
      const start = new NavLinksService().start({ application: mockAppService });
      expect(start.get('app1')!.title).toEqual('App 1');
    });

    it('returns undefined if it does not exist', () => {
      const start = new NavLinksService().start({ application: mockAppService });
      expect(start.get('phony')).toBeUndefined();
    });
  });

  describe('#getAll()', () => {
    it('returns a sorted array of navlinks', () => {
      const start = new NavLinksService().start({ application: mockAppService });
      expect(start.getAll().map(l => l.id)).toEqual(['app2', 'app1', 'legacyApp']);
    });
  });

  describe('#exists()', () => {
    it('returns true if exists', () => {
      const start = new NavLinksService().start({ application: mockAppService });
      expect(start.exists('app1')).toBe(true);
    });

    it('returns false if it does not exist', () => {
      const start = new NavLinksService().start({ application: mockAppService });
      expect(start.exists('phony')).toBe(false);
    });
  });

  describe('#showOnly()', () => {
    it('does nothing if link does not exist', async () => {
      const start = new NavLinksService().start({ application: mockAppService });
      start.showOnly('fake');
      expect(
        await start
          .getNavLinks$()
          .pipe(
            take(1),
            map(links => links.map(l => l.id))
          )
          .toPromise()
      ).toEqual(['app2', 'app1', 'legacyApp']);
    });

    it('removes all other links', async () => {
      const start = new NavLinksService().start({ application: mockAppService });
      start.showOnly('app1');
      expect(
        await start
          .getNavLinks$()
          .pipe(
            take(1),
            map(links => links.map(l => l.id))
          )
          .toPromise()
      ).toEqual(['app1']);
    });
  });

  describe('#update()', () => {
    it('updates the navlinks and returns the updated link', async () => {
      const start = new NavLinksService().start({ application: mockAppService });
      expect(start.update('app1', { hidden: true })).toMatchInlineSnapshot(`
Object {
  "appUrl": "/app1",
  "hidden": true,
  "icon": "app1",
  "id": "app1",
  "order": 0,
  "rootRoute": "/app1",
  "title": "App 1",
}
`);
      const hiddenLinkIds = await start
        .getNavLinks$()
        .pipe(
          take(1),
          map(links => links.filter(l => l.hidden).map(l => l.id))
        )
        .toPromise();
      expect(hiddenLinkIds).toEqual(['app1']);
    });

    it('returns undefined if link does not exist', () => {
      const start = new NavLinksService().start({ application: mockAppService });
      expect(start.update('fake', { hidden: true })).toBeUndefined();
    });
  });

  describe('#enableForcedAppSwitcherNavigation()', () => {
    it('flips #getForceAppSwitcherNavigation$()', async () => {
      const start = new NavLinksService().start({ application: mockAppService });
      await expect(
        start
          .getForceAppSwitcherNavigation$()
          .pipe(take(1))
          .toPromise()
      ).resolves.toBe(false);

      start.enableForcedAppSwitcherNavigation();

      await expect(
        start
          .getForceAppSwitcherNavigation$()
          .pipe(take(1))
          .toPromise()
      ).resolves.toBe(true);
    });
  });
});

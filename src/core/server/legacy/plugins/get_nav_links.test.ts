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

import { LegacyUiExports, LegacyPluginSpec, LegacyAppSpec, LegacyNavLinkSpec } from '../types';
import { getNavLinks } from './get_nav_links';

const createLegacyExports = ({
  uiAppSpecs = [],
  navLinkSpecs = [],
}: {
  uiAppSpecs?: LegacyAppSpec[];
  navLinkSpecs?: LegacyNavLinkSpec[];
}): LegacyUiExports => ({
  uiAppSpecs,
  navLinkSpecs,
  injectedVarsReplacers: [],
  defaultInjectedVarProviders: [],
  savedObjectMappings: [],
  savedObjectSchemas: {},
  savedObjectMigrations: {},
  savedObjectValidations: {},
});

const createPluginSpecs = (...ids: string[]): LegacyPluginSpec[] =>
  ids.map(
    id =>
      ({
        getId: () => id,
      } as LegacyPluginSpec)
  );

describe('getNavLinks', () => {
  describe('generating from uiAppSpecs', () => {
    it('generates navlinks from legacy app specs', () => {
      const navlinks = getNavLinks(
        createLegacyExports({
          uiAppSpecs: [
            {
              id: 'app-a',
              title: 'AppA',
              pluginId: 'pluginA',
            },
            {
              id: 'app-b',
              title: 'AppB',
              pluginId: 'pluginA',
            },
          ],
        }),
        createPluginSpecs('pluginA')
      );

      expect(navlinks.length).toEqual(2);
      expect(navlinks[0]).toEqual(
        expect.objectContaining({
          id: 'app-a',
          title: 'AppA',
          url: '/app/app-a',
        })
      );
      expect(navlinks[1]).toEqual(
        expect.objectContaining({
          id: 'app-b',
          title: 'AppB',
          url: '/app/app-b',
        })
      );
    });

    it('uses the app id to generates the navlink id even if pluginId is specified', () => {
      const navlinks = getNavLinks(
        createLegacyExports({
          uiAppSpecs: [
            {
              id: 'app-a',
              title: 'AppA',
              pluginId: 'pluginA',
            },
            {
              id: 'app-b',
              title: 'AppB',
              pluginId: 'pluginA',
            },
          ],
        }),
        createPluginSpecs('pluginA')
      );

      expect(navlinks.length).toEqual(2);
      expect(navlinks[0].id).toEqual('app-a');
      expect(navlinks[1].id).toEqual('app-b');
    });

    it('throws if an app reference a missing plugin', () => {
      expect(() => {
        getNavLinks(
          createLegacyExports({
            uiAppSpecs: [
              {
                id: 'app-a',
                title: 'AppA',
                pluginId: 'notExistingPlugin',
              },
            ],
          }),
          createPluginSpecs('pluginA')
        );
      }).toThrowErrorMatchingInlineSnapshot(`"Unknown plugin id \\"notExistingPlugin\\""`);
    });

    it('uses all known properties of the navlink', () => {
      const navlinks = getNavLinks(
        createLegacyExports({
          uiAppSpecs: [
            {
              id: 'app-a',
              title: 'AppA',
              order: 42,
              url: '/some-custom-url',
              icon: 'fa-snowflake',
              euiIconType: 'euiIcon',
              linkToLastSubUrl: true,
              hidden: false,
            },
          ],
        }),
        []
      );
      expect(navlinks.length).toBe(1);
      expect(navlinks[0]).toEqual({
        id: 'app-a',
        title: 'AppA',
        order: 42,
        url: '/some-custom-url',
        icon: 'fa-snowflake',
        euiIconType: 'euiIcon',
        linkToLastSubUrl: true,
      });
    });
  });

  describe('generating from navLinkSpecs', () => {
    it('generates navlinks from legacy navLink specs', () => {
      const navlinks = getNavLinks(
        createLegacyExports({
          navLinkSpecs: [
            {
              id: 'link-a',
              title: 'AppA',
              url: '/some-custom-url',
            },
            {
              id: 'link-b',
              title: 'AppB',
              url: '/some-other-url',
              disableSubUrlTracking: true,
            },
          ],
        }),
        createPluginSpecs('pluginA')
      );

      expect(navlinks.length).toEqual(2);
      expect(navlinks[0]).toEqual(
        expect.objectContaining({
          id: 'link-a',
          title: 'AppA',
          url: '/some-custom-url',
          hidden: false,
          disabled: false,
        })
      );
      expect(navlinks[1]).toEqual(
        expect.objectContaining({
          id: 'link-b',
          title: 'AppB',
          url: '/some-other-url',
          disableSubUrlTracking: true,
        })
      );
    });

    it('only uses known properties to create the navlink', () => {
      const navlinks = getNavLinks(
        createLegacyExports({
          navLinkSpecs: [
            {
              id: 'link-a',
              title: 'AppA',
              order: 72,
              url: '/some-other-custom',
              subUrlBase: '/some-other-custom/sub',
              disableSubUrlTracking: true,
              icon: 'fa-corn',
              euiIconType: 'euiIconBis',
              linkToLastSubUrl: false,
              hidden: false,
              tooltip: 'My other tooltip',
            },
          ],
        }),
        []
      );
      expect(navlinks.length).toBe(1);
      expect(navlinks[0]).toEqual({
        id: 'link-a',
        title: 'AppA',
        order: 72,
        url: '/some-other-custom',
        subUrlBase: '/some-other-custom/sub',
        disableSubUrlTracking: true,
        icon: 'fa-corn',
        euiIconType: 'euiIconBis',
        linkToLastSubUrl: false,
        hidden: false,
        disabled: false,
        tooltip: 'My other tooltip',
      });
    });
  });

  describe('generating from both apps and navlinks', () => {
    const navlinks = getNavLinks(
      createLegacyExports({
        uiAppSpecs: [
          {
            id: 'app-a',
            title: 'AppA',
          },
          {
            id: 'app-b',
            title: 'AppB',
          },
        ],
        navLinkSpecs: [
          {
            id: 'link-a',
            title: 'AppA',
            url: '/some-custom-url',
          },
          {
            id: 'link-b',
            title: 'AppB',
            url: '/url-b',
            disableSubUrlTracking: true,
          },
        ],
      }),
      []
    );

    expect(navlinks.length).toBe(4);
    expect(navlinks).toMatchSnapshot();
  });
});

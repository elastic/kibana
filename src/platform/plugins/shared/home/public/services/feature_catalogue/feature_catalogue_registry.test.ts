/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { firstValueFrom } from 'rxjs';
import {
  FeatureCatalogueEntry,
  FeatureCatalogueRegistry,
  FeatureCatalogueSolution,
} from './feature_catalogue_registry';

const DASHBOARD_FEATURE: FeatureCatalogueEntry = {
  id: 'dashboard',
  title: 'Dashboard',
  description: 'Display and share a collection of visualizations and search results.',
  icon: 'dashboardApp',
  path: `/app/kibana#dashboard`,
  showOnHomePage: true,
  category: 'data',
};

const KIBANA_SOLUTION: FeatureCatalogueSolution = {
  id: 'kibana',
  title: 'Analytics',
  description:
    'Explore, visualize, and analyze your data using a powerful suite of analytical tools and applications.',
  icon: 'kibanaApp',
  path: `/app/home`,
  order: 400,
};

describe('FeatureCatalogueRegistry', () => {
  describe('setup', () => {
    test('throws when registering a feature with a duplicate id', () => {
      const setup = new FeatureCatalogueRegistry().setup();
      setup.register(DASHBOARD_FEATURE);
      expect(() => setup.register(DASHBOARD_FEATURE)).toThrowErrorMatchingInlineSnapshot(
        `"Feature with id [dashboard] has already been registered. Use a unique id."`
      );
    });

    test('throws when registering a solution with a duplicate id', () => {
      const setup = new FeatureCatalogueRegistry().setup();
      setup.registerSolution(KIBANA_SOLUTION);
      expect(() => setup.registerSolution(KIBANA_SOLUTION)).toThrowErrorMatchingInlineSnapshot(
        `"Solution with id [kibana] has already been registered. Use a unique id."`
      );
    });

    test('throws when getting features before start()', async () => {
      const getFeaturesBeforeStart = async () => {
        const service = new FeatureCatalogueRegistry();
        const catalogue = service.setup();
        catalogue.register(DASHBOARD_FEATURE);
        await firstValueFrom(service.getFeatures$());
      };
      expect(getFeaturesBeforeStart).rejects.toEqual(
        new Error(`Catalogue entries are only available after start phase`)
      );
    });
  });

  describe('start', () => {
    describe('capabilities filtering', () => {
      test('retains items with no entry in capabilities', async () => {
        const service = new FeatureCatalogueRegistry();
        service.setup().register(DASHBOARD_FEATURE);
        const capabilities = { catalogue: {} } as any;
        service.start({ capabilities });
        expect(await firstValueFrom(service.getFeatures$())).toEqual([DASHBOARD_FEATURE]);
      });

      test('retains items with true in capabilities', async () => {
        const service = new FeatureCatalogueRegistry();
        service.setup().register(DASHBOARD_FEATURE);
        const capabilities = { catalogue: { dashboard: true } } as any;
        service.start({ capabilities });
        expect(await firstValueFrom(service.getFeatures$())).toEqual([DASHBOARD_FEATURE]);
      });

      test('removes items with false in capabilities', async () => {
        const service = new FeatureCatalogueRegistry();
        service.setup().register(DASHBOARD_FEATURE);
        const capabilities = { catalogue: { dashboard: false } } as any;
        service.start({ capabilities });
        expect(await firstValueFrom(service.getFeatures$())).toEqual([]);
      });
    });

    describe('visibility filtering', () => {
      test('retains items with no "visible" callback', async () => {
        const service = new FeatureCatalogueRegistry();
        service.setup().register(DASHBOARD_FEATURE);
        const capabilities = { catalogue: {} } as any;
        service.start({ capabilities });
        expect(await firstValueFrom(service.getFeatures$())).toEqual([DASHBOARD_FEATURE]);
      });

      test('retains items with a "visible" callback which returns "true"', async () => {
        const service = new FeatureCatalogueRegistry();
        const feature = {
          ...DASHBOARD_FEATURE,
          visible: () => true,
        };
        service.setup().register(feature);
        const capabilities = { catalogue: {} } as any;
        service.start({ capabilities });
        expect(await firstValueFrom(service.getFeatures$())).toEqual([feature]);
      });

      test('removes items with a "visible" callback which returns "false"', async () => {
        const service = new FeatureCatalogueRegistry();
        const feature = {
          ...DASHBOARD_FEATURE,
          visible: () => false,
        };
        service.setup().register(feature);
        const capabilities = { catalogue: {} } as any;
        service.start({ capabilities });
        expect(await firstValueFrom(service.getFeatures$())).toEqual([]);
      });
    });
  });

  describe('reactivity', () => {
    const DASHBOARD_FEATURE_2: FeatureCatalogueEntry = {
      ...DASHBOARD_FEATURE,
      id: 'dashboard_2',
    };

    test('addition of catalogue entry after start()', async () => {
      const service = new FeatureCatalogueRegistry();
      const catalogue = service.setup();
      const capabilities = { catalogue: { dashboard: true } } as any;
      service.start({ capabilities });
      catalogue.register(DASHBOARD_FEATURE);
      catalogue.register(DASHBOARD_FEATURE_2);
      expect(await firstValueFrom(service.getFeatures$())).toEqual([
        DASHBOARD_FEATURE,
        DASHBOARD_FEATURE_2,
      ]);
    });

    test('removal of catalogue entry after start()', async () => {
      const service = new FeatureCatalogueRegistry();
      const catalogue = service.setup();
      catalogue.register(DASHBOARD_FEATURE);
      catalogue.register(DASHBOARD_FEATURE_2);
      const capabilities = { catalogue: { dashboard: true } } as any;
      service.start({ capabilities });
      service.removeFeature('dashboard');
      expect(await firstValueFrom(service.getFeatures$())).toEqual([DASHBOARD_FEATURE_2]);
    });
  });

  describe('title sorting', () => {
    test('sorts by title ascending', async () => {
      const service = new FeatureCatalogueRegistry();
      const setup = service.setup();
      setup.register({ id: '1', title: 'Orange' } as any);
      setup.register({ id: '2', title: 'Apple' } as any);
      setup.register({ id: '3', title: 'Banana' } as any);
      const capabilities = { catalogue: {} } as any;
      service.start({ capabilities });
      expect(await firstValueFrom(service.getFeatures$())).toEqual([
        { id: '2', title: 'Apple' },
        { id: '3', title: 'Banana' },
        { id: '1', title: 'Orange' },
      ]);
    });
  });
});

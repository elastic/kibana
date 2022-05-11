/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  FeatureCatalogueRegistry,
  FeatureCatalogueEntry,
  FeatureCatalogueSolution,
} from './feature_catalogue_registry';

const DASHBOARD_FEATURE: FeatureCatalogueEntry = {
  id: 'dashboard',
  title: 'Dashboard',
  description: 'Display and share a collection of visualizations and saved searches.',
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
  });

  describe('start', () => {
    describe('capabilities filtering', () => {
      test('retains items with no entry in capabilities', () => {
        const service = new FeatureCatalogueRegistry();
        service.setup().register(DASHBOARD_FEATURE);
        const capabilities = { catalogue: {} } as any;
        service.start({ capabilities });
        expect(service.get()).toEqual([DASHBOARD_FEATURE]);
      });

      test('retains items with true in capabilities', () => {
        const service = new FeatureCatalogueRegistry();
        service.setup().register(DASHBOARD_FEATURE);
        const capabilities = { catalogue: { dashboard: true } } as any;
        service.start({ capabilities });
        expect(service.get()).toEqual([DASHBOARD_FEATURE]);
      });

      test('removes items with false in capabilities', () => {
        const service = new FeatureCatalogueRegistry();
        service.setup().register(DASHBOARD_FEATURE);
        const capabilities = { catalogue: { dashboard: false } } as any;
        service.start({ capabilities });
        expect(service.get()).toEqual([]);
      });
    });

    describe('visibility filtering', () => {
      test('retains items with no "visible" callback', () => {
        const service = new FeatureCatalogueRegistry();
        service.setup().register(DASHBOARD_FEATURE);
        const capabilities = { catalogue: {} } as any;
        service.start({ capabilities });
        expect(service.get()).toEqual([DASHBOARD_FEATURE]);
      });

      test('retains items with a "visible" callback which returns "true"', () => {
        const service = new FeatureCatalogueRegistry();
        const feature = {
          ...DASHBOARD_FEATURE,
          visible: () => true,
        };
        service.setup().register(feature);
        const capabilities = { catalogue: {} } as any;
        service.start({ capabilities });
        expect(service.get()).toEqual([feature]);
      });

      test('removes items with a "visible" callback which returns "false"', () => {
        const service = new FeatureCatalogueRegistry();
        const feature = {
          ...DASHBOARD_FEATURE,
          visible: () => false,
        };
        service.setup().register(feature);
        const capabilities = { catalogue: {} } as any;
        service.start({ capabilities });
        expect(service.get()).toEqual([]);
      });
    });
  });

  describe('title sorting', () => {
    test('sorts by title ascending', () => {
      const service = new FeatureCatalogueRegistry();
      const setup = service.setup();
      setup.register({ id: '1', title: 'Orange' } as any);
      setup.register({ id: '2', title: 'Apple' } as any);
      setup.register({ id: '3', title: 'Banana' } as any);
      const capabilities = { catalogue: {} } as any;
      service.start({ capabilities });
      expect(service.get()).toEqual([
        { id: '2', title: 'Apple' },
        { id: '3', title: 'Banana' },
        { id: '1', title: 'Orange' },
      ]);
    });
  });
});

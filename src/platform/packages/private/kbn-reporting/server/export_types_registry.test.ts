/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LicensingPluginSetup } from '@kbn/licensing-plugin/server';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { ExportTypesRegistry } from './export_types_registry';
import type { BaseExportTypeSetupDeps, BaseExportTypeStartDeps, ExportType } from './export_type';
import { LICENSE_TYPE_GOLD } from '@kbn/reporting-common';
import type { HttpServiceSetup, PluginInitializerContext } from '@kbn/core/server';
import type { ReportingConfigType } from './types';
import { loggerMock } from '@kbn/logging-mocks';

const getExportType = (overwrites = {}): ExportType => {
  return {
    id: 'test',
    name: 'Test Export Type',
    jobType: 'testJobType',
    jobContentExtension: 'pdf',
    validLicenses: [LICENSE_TYPE_GOLD],
    setup: jest.fn(),
    start: jest.fn(),
    shouldNotifyUsage: () => false,
    getFeatureUsageName: () => 'Reporting: test export',
    notifyUsage: jest.fn(),
    createJob: jest.fn(),
    runTask: jest.fn(),
    setupDeps: {} as unknown as BaseExportTypeSetupDeps,
    startDeps: {} as unknown as BaseExportTypeStartDeps,
    http: {} as unknown as HttpServiceSetup,
    config: {} as unknown as ReportingConfigType,
    logger: loggerMock.create(),
    context: {} as unknown as PluginInitializerContext,
    ...overwrites,
  } as unknown as ExportType;
};
describe('ExportTypesRegistry', () => {
  let licensing: jest.Mocked<LicensingPluginSetup>;
  let exportTypesRegistry: ExportTypesRegistry;
  beforeEach(() => {
    licensing = licensingMock.createSetup();
    exportTypesRegistry = new ExportTypesRegistry(licensing);
  });

  describe('register', () => {
    it(`doesn't throw an Error when using a new type with a string id`, () => {
      expect(() => {
        exportTypesRegistry.register(getExportType({ id: 'foo' }));
      }).not.toThrow();
    });

    it('throws an Error when registering a type without an id', () => {
      expect(() => {
        exportTypesRegistry.register(getExportType({ id: null }));
      }).toThrow();
    });

    it('throws an Error when registering a type with an integer id', () => {
      expect(() => {
        exportTypesRegistry.register(getExportType({ id: 1 }));
      }).toThrow();
    });

    it('throws an Error when registering the same id twice', () => {
      const exportType = getExportType({ id: 'foo' });
      expect(() => {
        exportTypesRegistry.register(exportType);
      }).not.toThrow();

      expect(() => {
        exportTypesRegistry.register(exportType);
      }).toThrow();
    });
  });

  describe('registerFeatureUsage', () => {
    it('should register feature usage with feature usage name when should notify is true', () => {
      const exportType = getExportType({
        id: 'foo',
        shouldNotifyUsage: () => true,
        getFeatureUsageName: () => 'foo feature usage',
      });
      exportTypesRegistry.register(exportType);

      expect(licensing.featureUsage.register).toHaveBeenCalledWith('foo feature usage', 'gold');
    });

    it('should not register feature usage when should notify is false', () => {
      const exportType = getExportType({
        id: 'foo',
        shouldNotifyUsage: () => false,
        getFeatureUsageName: () => 'foo feature usage',
      });
      exportTypesRegistry.register(exportType);

      expect(licensing.featureUsage.register).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns the same object that was registered', () => {
      const id = 'foo';
      const exportType = getExportType({ id });
      exportTypesRegistry.register(exportType);
      exportTypesRegistry.register(getExportType({ id: 'bar' }));
      expect(exportTypesRegistry.getById(id)).toBe(exportType);
    });

    it(`throws an Error if the id isn't found`, () => {
      expect(() => {
        exportTypesRegistry.getById('foo');
      }).toThrow();
    });
  });

  describe('getAll', () => {
    it('returns an empty Iterator if no objects have been registered', () => {
      const array = Array.from(exportTypesRegistry.getAll());
      expect(array.length).toBe(0);
    });

    it('returns all objects that have been registered', () => {
      const exportType1 = getExportType({ id: 'foo' });
      const exportType2 = getExportType({ id: 'bar' });
      const exportTypes = [exportType1, exportType2];
      exportTypes.forEach((type) => exportTypesRegistry.register(type));
      const all = Array.from(exportTypesRegistry.getAll());
      expect(all).toContain(exportType1);
      expect(all).toContain(exportType2);
    });
  });

  describe('getSize', () => {
    it('returns 0 initially', () => {
      const size = exportTypesRegistry.getSize();
      expect(size).toBe(0);
    });

    it('returns the number of objects that have been added', () => {
      exportTypesRegistry.register(getExportType({ id: 'foo' }));
      exportTypesRegistry.register(getExportType({ id: 'bar' }));
      exportTypesRegistry.register(getExportType({ id: 'baz' }));
      const size = exportTypesRegistry.getSize();
      expect(size).toBe(3);
    });
  });

  describe('get', () => {
    it('returns obj that matches the predicate', () => {
      const prop = 'fooProp';
      const exportType1 = getExportType({ id: 'foo', prop });
      const exportType2 = getExportType({ id: 'bar' });
      const exportType3 = getExportType({ id: 'baz' });
      const exportTypes = [exportType1, exportType2, exportType3];
      exportTypes.forEach((type) => exportTypesRegistry.register(type));
      // @ts-expect-error
      expect(exportTypesRegistry.get((item) => item.prop === prop)).toBe(exportType1);
    });

    it('throws Error if multiple items match predicate', () => {
      const prop = 'fooProp';
      const exportType1 = getExportType({ id: 'foo', prop });
      const exportType2 = getExportType({ id: 'bar', prop });
      const exportTypes = [exportType1, exportType2];
      exportTypes.forEach((type) => exportTypesRegistry.register(type));
      expect(() => {
        // @ts-expect-error
        exportTypesRegistry.get((item) => item.prop === prop);
      }).toThrow();
    });

    it('throws Error if no items match predicate', () => {
      const prop = 'fooProp';
      const exportType1 = getExportType({ id: 'foo', prop });
      const exportType2 = getExportType({ id: 'bar', prop });
      const exportTypes = [exportType1, exportType2];
      exportTypes.forEach((type) => exportTypesRegistry.register(type));
      expect(() => {
        // @ts-expect-error
        exportTypesRegistry.get((item) => item.prop !== prop);
      }).toThrow();
    });
  });

  describe('getByJobType', () => {
    it('returns obj that matches the predicate', () => {
      const prop = 'fooProp';
      const exportType1 = getExportType({ id: 'foo', jobType: prop });
      const exportType2 = getExportType({ id: 'bar' });
      const exportType3 = getExportType({ id: 'baz' });
      const exportTypes = [exportType1, exportType2, exportType3];
      exportTypes.forEach((type) => exportTypesRegistry.register(type));
      expect(exportTypesRegistry.getByJobType(prop)).toBe(exportType1);
    });

    it('throws Error if multiple items match predicate', () => {
      const prop = 'fooProp';
      const exportType1 = getExportType({ id: 'foo', jobType: prop });
      const exportType2 = getExportType({ id: 'bar', jobType: prop });
      const exportTypes = [exportType1, exportType2];
      exportTypes.forEach((type) => exportTypesRegistry.register(type));
      expect(() => {
        exportTypesRegistry.getByJobType(prop);
      }).toThrow();
    });

    it('throws Error if no items match predicate', () => {
      const prop = 'fooProp';
      const exportType1 = getExportType({ id: 'foo', jobType: prop });
      const exportType2 = getExportType({ id: 'bar', jobType: prop });
      const exportTypes = [exportType1, exportType2];
      exportTypes.forEach((type) => exportTypesRegistry.register(type));
      expect(() => exportTypesRegistry.getByJobType('foo')).toThrow();
    });
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SolutionType } from '../../../profiles';
import { createProfileProviderSharedServicesMock } from '../../../__mocks__';
import { createObservabilityRootProfileProvider } from './profile';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';

const mockServices = createProfileProviderSharedServicesMock();

describe('observabilityRootProfileProvider', () => {
  const observabilityRootProfileProvider = createObservabilityRootProfileProvider(mockServices);
  const RESOLUTION_MATCH = {
    isMatch: true,
    context: expect.objectContaining({ solutionType: SolutionType.Observability }),
  };
  const RESOLUTION_MISMATCH = {
    isMatch: false,
  };

  it('should match when the solution project is observability', async () => {
    expect(
      await observabilityRootProfileProvider.resolve({
        solutionNavId: SolutionType.Observability,
      })
    ).toEqual(RESOLUTION_MATCH);
  });

  it('should NOT match when the solution project anything but observability', async () => {
    expect(
      await observabilityRootProfileProvider.resolve({
        solutionNavId: SolutionType.Default,
      })
    ).toEqual(RESOLUTION_MISMATCH);
    expect(
      await observabilityRootProfileProvider.resolve({
        solutionNavId: SolutionType.Search,
      })
    ).toEqual(RESOLUTION_MISMATCH);
    expect(
      await observabilityRootProfileProvider.resolve({
        solutionNavId: SolutionType.Security,
      })
    ).toEqual(RESOLUTION_MISMATCH);
  });

  describe('getDefaultAdHocDataViews', () => {
    it('should return an "All logs" default data view', async () => {
      const result = await observabilityRootProfileProvider.resolve({
        solutionNavId: SolutionType.Observability,
      });
      if (!result.isMatch) {
        throw new Error('Expected result to match');
      }
      expect(result.context.allLogsIndexPattern).toEqual('logs-*');
      const defaultDataViews = observabilityRootProfileProvider.profile.getDefaultAdHocDataViews?.(
        () => [],
        { context: result.context }
      )();
      expect(defaultDataViews).toEqual([
        {
          id: 'discover-observability-solution-all-logs',
          name: 'All logs',
          timeFieldName: '@timestamp',
          title: 'logs-*',
        },
      ]);
    });

    it('should return no default data views', async () => {
      jest
        .spyOn(mockServices.logsContextService, 'getAllLogsIndexPattern')
        .mockReturnValueOnce(undefined);
      const result = await observabilityRootProfileProvider.resolve({
        solutionNavId: SolutionType.Observability,
      });
      if (!result.isMatch) {
        throw new Error('Expected result to match');
      }
      expect(result.context.allLogsIndexPattern).toEqual(undefined);
      const defaultDataViews = observabilityRootProfileProvider.profile.getDefaultAdHocDataViews?.(
        () => [],
        { context: result.context }
      )();
      expect(defaultDataViews).toEqual([]);
    });
  });

  describe('getDocViewer', () => {
    it('does NOT add attributes doc viewer tab to the registry when the record has no attributes fields', () => {
      const getDocViewer = observabilityRootProfileProvider.profile.getDocViewer!(
        () => ({
          title: 'test title',
          docViewsRegistry: (registry) => registry,
        }),
        {
          context: {
            solutionType: SolutionType.Observability,
            allLogsIndexPattern: mockServices.logsContextService.getAllLogsIndexPattern(),
          },
        }
      );

      const docViewer = getDocViewer({
        actions: {},
        record: buildMockRecord('test-index', {
          foo: 'bar',
        }),
      });

      const registry = new DocViewsRegistry();

      expect(docViewer.title).toBe('test title');
      expect(registry.getAll()).toHaveLength(0);

      docViewer.docViewsRegistry(registry);

      expect(registry.getAll()).toHaveLength(0);
    });
    it('adds attributes doc viwer tab to the registry when the record has any attributes. field', () => {
      const getDocViewer = observabilityRootProfileProvider.profile.getDocViewer!(
        () => ({
          title: 'test title',
          docViewsRegistry: (registry) => registry,
        }),
        {
          context: {
            solutionType: SolutionType.Observability,
            allLogsIndexPattern: mockServices.logsContextService.getAllLogsIndexPattern(),
          },
        }
      );

      const docViewer = getDocViewer({
        actions: {},
        record: buildMockRecord('test-index', {
          'attributes.foo': 'bar',
        }),
      });

      const registry = new DocViewsRegistry();

      expect(docViewer.title).toBe('test title');
      expect(registry.getAll()).toHaveLength(0);
      docViewer.docViewsRegistry(registry);

      expect(registry.getAll()).toHaveLength(1);

      expect(registry.getAll()[0]).toEqual(
        expect.objectContaining({
          id: 'doc_view_obs_attributes_overview',
          title: 'Attributes',
          order: 9,
          render: expect.any(Function),
        })
      );
    });
    it('adds attributes doc viwer tab to the registry when the record has any scope.attributes. field', () => {
      const getDocViewer = observabilityRootProfileProvider.profile.getDocViewer!(
        () => ({
          title: 'test title',
          docViewsRegistry: (registry) => registry,
        }),
        {
          context: {
            solutionType: SolutionType.Observability,
            allLogsIndexPattern: mockServices.logsContextService.getAllLogsIndexPattern(),
          },
        }
      );

      const docViewer = getDocViewer({
        actions: {},
        record: buildMockRecord('test-index', {
          'scope.attributes.foo': 'bar',
        }),
      });

      const registry = new DocViewsRegistry();

      expect(docViewer.title).toBe('test title');
      expect(registry.getAll()).toHaveLength(0);
      docViewer.docViewsRegistry(registry);

      expect(registry.getAll()).toHaveLength(1);

      expect(registry.getAll()[0]).toEqual(
        expect.objectContaining({
          id: 'doc_view_obs_attributes_overview',
          title: 'Attributes',
          order: 9,
          render: expect.any(Function),
        })
      );
    });
    it('adds attributes doc viewer tab to the registry when the record has any resource.attributes. field', () => {
      const getDocViewer = observabilityRootProfileProvider.profile.getDocViewer!(
        () => ({
          title: 'test title',
          docViewsRegistry: (registry) => registry,
        }),
        {
          context: {
            solutionType: SolutionType.Observability,
            allLogsIndexPattern: mockServices.logsContextService.getAllLogsIndexPattern(),
          },
        }
      );

      const docViewer = getDocViewer({
        actions: {},
        record: buildMockRecord('test-index', {
          'resource.attributes.foo': 'bar',
        }),
      });

      const registry = new DocViewsRegistry();

      expect(docViewer.title).toBe('test title');
      expect(registry.getAll()).toHaveLength(0);
      docViewer.docViewsRegistry(registry);

      expect(registry.getAll()).toHaveLength(1);

      expect(registry.getAll()[0]).toEqual(
        expect.objectContaining({
          id: 'doc_view_obs_attributes_overview',
          title: 'Attributes',
          order: 9,
          render: expect.any(Function),
        })
      );
    });
  });
});

const buildMockRecord = (index: string, fields: Record<string, unknown> = {}) =>
  buildDataTableRecord({
    _id: '',
    _index: index,
    fields: {
      _index: index,
      ...fields,
    },
  });

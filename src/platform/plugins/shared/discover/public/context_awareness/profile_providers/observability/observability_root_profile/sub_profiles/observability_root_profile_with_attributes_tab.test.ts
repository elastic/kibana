/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildDataTableRecord } from '@kbn/discover-utils';
import { createContextAwarenessMocks } from '../../../../__mocks__';
import { SolutionType } from '../../../../profiles';
import { createObservabilityRootProfileProvider } from '../profile';
import { createObservabilityRootProfileProviderWithAttributesTab } from './observability_root_profile_with_attributes_tab';
import { DocViewsRegistry } from '@kbn/unified-doc-viewer';

const mockServices = createContextAwarenessMocks().profileProviderServices;

describe('createObservabilityRootProfileProviderWithAttributesTab', () => {
  const observabilityRootProfileProvider = createObservabilityRootProfileProvider(mockServices);
  const observabilityRootProfileProviderWithAttributes =
    createObservabilityRootProfileProviderWithAttributesTab(observabilityRootProfileProvider);

  describe('getDocViewer', () => {
    it('does NOT add attributes doc viewer tab to the registry when the record has no attributes fields', () => {
      const getDocViewer = observabilityRootProfileProviderWithAttributes.profile.getDocViewer!(
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
      const getDocViewer = observabilityRootProfileProviderWithAttributes.profile.getDocViewer!(
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
          component: expect.any(Function),
        })
      );
    });
    it('adds attributes doc viwer tab to the registry when the record has any scope.attributes. field', () => {
      const getDocViewer = observabilityRootProfileProviderWithAttributes.profile.getDocViewer!(
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
          component: expect.any(Function),
        })
      );
    });
    it('adds attributes doc viwer tab to the registry when the record has any resource.attributes. field', () => {
      const getDocViewer = observabilityRootProfileProviderWithAttributes.profile.getDocViewer!(
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
          component: expect.any(Function),
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

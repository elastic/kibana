/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { ProfileProviderServices } from '../profile_provider_services';
import { DocumentType } from '../../profiles';
import { createSecurityDocumentProfileProviders } from './security_profile_providers';

const createRecord = (flattened: DataTableRecord['flattened']): DataTableRecord =>
  ({
    id: '1',
    raw: {},
    flattened,
    isAnchor: false,
  } as DataTableRecord);

const getDocViewerResult = (record: DataTableRecord) => {
  const providerServices = {} as ProfileProviderServices;
  const [enhancedProvider] = createSecurityDocumentProfileProviders(providerServices);
  const prevRenderHeader = jest.fn();
  const prevDocViewer = {
    renderHeader: prevRenderHeader,
    docViewsRegistry: jest.fn((r) => r),
  };
  const prev = jest.fn().mockReturnValue(prevDocViewer);
  const getDocViewer = enhancedProvider.profile.getDocViewer!(prev, {
    context: { type: DocumentType.Default },
  });
  const result = getDocViewer({ actions: {}, record } as Parameters<typeof getDocViewer>[0]);
  return { result, prevRenderHeader };
};

describe('createSecurityDocumentProfileProviders', () => {
  describe('getDocViewer', () => {
    it('overrides renderHeader for alert documents', () => {
      const { result, prevRenderHeader } = getDocViewerResult(
        createRecord({ 'event.kind': 'signal' })
      );

      expect(result.renderHeader).toBeDefined();
      expect(result.renderHeader).not.toBe(prevRenderHeader);
    });

    it('does not override renderHeader for non-alert documents', () => {
      const { result, prevRenderHeader } = getDocViewerResult(
        createRecord({ 'event.kind': 'event' })
      );

      expect(result.renderHeader).toBe(prevRenderHeader);
    });

    it('adds the overview tab to the registry for alert documents', () => {
      const { result } = getDocViewerResult(createRecord({ 'event.kind': 'signal' }));
      const registry = { add: jest.fn() };
      result.docViewsRegistry(registry as never);

      expect(registry.add).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'doc_view_alerts_overview' })
      );
    });

    it('does not add the overview tab to the registry for non-alert documents', () => {
      const { result } = getDocViewerResult(createRecord({ 'event.kind': 'event' }));
      const registry = { add: jest.fn() };
      result.docViewsRegistry(registry as never);

      expect(registry.add).not.toHaveBeenCalled();
    });
  });
});

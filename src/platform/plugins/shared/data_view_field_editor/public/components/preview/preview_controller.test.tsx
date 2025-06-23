/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PreviewController, PreviewControllerDependencies } from './preview_controller';
import { DebouncedFuncLeading } from 'lodash';
import type { InternalFieldType } from '../../types';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import { coreMock } from '@kbn/core/public/mocks';
import type { ISearchStart } from '@kbn/data-plugin/public';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { usageCollectionPluginMock } from '@kbn/usage-collection-plugin/public/mocks';
import { createStubDataViewLazy } from '@kbn/data-views-plugin/common/data_views/data_view_lazy.stub';

describe('PreviewController', () => {
  describe('setCustomDocIdToLoad', () => {
    const coreStartMock = coreMock.createStart();
    const dataViewMock = dataViewPluginMocks.createStartContract();

    const mockDeps: PreviewControllerDependencies = {
      search: {
        search: jest.fn(() => ({
          toPromise: jest.fn().mockResolvedValue({ rawResponse: { hits: { hits: [] } } }),
        })),
      } as unknown as ISearchStart,
      fieldFormats: fieldFormatsMock,
      usageCollection: usageCollectionPluginMock.createSetupContract(),
      notifications: coreStartMock.notifications,
      dataViews: dataViewMock,
    };

    // Mock data view with enough properties to pass type checks
    const mockDataView = createStubDataViewLazy({
      spec: {
        id: 'test-index',
        title: 'test-index',
      },
    });

    type ControllerWithPrivate = PreviewController & {
      debouncedLoadDocument: DebouncedFuncLeading<(id: string) => Promise<void>>;
    };

    const setup = (customDocIdToLoad: string | null) => {
      const controller = new PreviewController({
        deps: mockDeps,
        dataView: mockDataView,
        dataViewToUpdate: mockDataView,
        onSave: jest.fn(),
        fieldTypeToProcess: 'runtime' as InternalFieldType,
      });

      const debouncedLoadDocumentMock = jest.fn();
      (controller as ControllerWithPrivate).debouncedLoadDocument =
        debouncedLoadDocumentMock as unknown as DebouncedFuncLeading<(id: string) => Promise<void>>;
      controller.setCustomDocIdToLoad(customDocIdToLoad);
      return { state: controller.state$.getValue(), debouncedLoadDocumentMock };
    };

    it('should properly handle empty string for customDocIdToLoad', () => {
      const { state, debouncedLoadDocumentMock } = setup('');
      expect(state.customId).toBe('');
      expect(state.customDocIdToLoad).toBe('');
      expect(debouncedLoadDocumentMock).not.toHaveBeenCalled();
    });

    it('should properly handle valid IDs for customDocIdToLoad', () => {
      const { state, debouncedLoadDocumentMock } = setup('doc123');
      expect(state.customId).toBe('doc123');
      expect(state.customDocIdToLoad).toBe('doc123');
      expect(debouncedLoadDocumentMock).toHaveBeenCalledWith('doc123');
    });

    it('should properly handle null for customDocIdToLoad', () => {
      const { state, debouncedLoadDocumentMock } = setup(null);
      expect(state.customId).toBeUndefined();
      expect(state.customDocIdToLoad).toBeNull();
      expect(debouncedLoadDocumentMock).not.toHaveBeenCalled();
    });
  });
});

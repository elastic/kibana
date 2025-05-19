/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PreviewController, PreviewControllerDependencies } from './preview_controller';
import type {
  DataViewLazy,
  DataView,
  DataViewsPublicPluginStart,
} from '@kbn/data-views-plugin/public';
import { DebouncedFuncLeading } from 'lodash';
import type { InternalFieldType } from '../../types';
import type { NotificationsStart } from '@kbn/core/public';
import type { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import type { ISearchStart } from '@kbn/data-plugin/public';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

describe('PreviewController', () => {
  describe('setCustomDocIdToLoad', () => {
    // Create mock dependencies with the necessary types to satisfy TypeScript
    const mockDeps: PreviewControllerDependencies = {
      search: {
        search: jest.fn(() => ({
          toPromise: jest.fn().mockResolvedValue({ rawResponse: { hits: { hits: [] } } }),
        })),
      } as unknown as ISearchStart,
      fieldFormats: {
        getInstance: jest.fn(),
        getDefaultInstance: jest.fn(),
      } as unknown as FieldFormatsStart,
      usageCollection: {
        reportUiCounter: jest.fn(),
      } as unknown as UsageCollectionStart,
      notifications: {
        toasts: {
          addSuccess: jest.fn(),
          addError: jest.fn(),
          add: jest.fn(),
          remove: jest.fn(),
          addInfo: jest.fn(),
          addWarning: jest.fn(),
          get$: jest.fn(),
        },
      } as unknown as NotificationsStart,
      dataViews: {
        updateSavedObject: jest.fn(),
      } as unknown as DataViewsPublicPluginStart,
    };

    // Mock data view with enough properties to pass type checks
    const mockDataView = {
      getIndexPattern: jest.fn().mockReturnValue('test-index'),
      getFields: jest.fn().mockReturnValue({
        getFieldMapSorted: jest.fn().mockReturnValue({}),
        getFieldMap: jest.fn().mockReturnValue({}),
      }),
      // Add more required properties as TypeScript needs them
      fields: { getByName: jest.fn() },
      title: 'test-index',
      isPersisted: jest.fn().mockReturnValue(true),
    };

    let controller: PreviewController;
    type ControllerWithPrivate = PreviewController & {
      debouncedLoadDocument: DebouncedFuncLeading<(id: string) => Promise<void>>;
    };
    let debouncedLoadDocumentMock: jest.Mock;

    beforeEach(() => {
      controller = new PreviewController({
        deps: mockDeps,
        dataView: mockDataView as unknown as DataViewLazy,
        dataViewToUpdate: mockDataView as unknown as DataView,
        onSave: jest.fn(),
        fieldTypeToProcess: 'runtime' as InternalFieldType,
      });
      debouncedLoadDocumentMock = jest.fn();
      (controller as ControllerWithPrivate).debouncedLoadDocument =
        debouncedLoadDocumentMock as unknown as DebouncedFuncLeading<(id: string) => Promise<void>>;
    });

    it('should properly handle empty string for customDocIdToLoad', () => {
      controller.setCustomDocIdToLoad('');
      const state = controller.state$.getValue();
      expect(state.customId).toBe('');
      expect(state.customDocIdToLoad).toBe('');
      expect(debouncedLoadDocumentMock).not.toHaveBeenCalled();
    });

    it('should properly handle valid IDs for customDocIdToLoad', () => {
      controller.setCustomDocIdToLoad('doc123');
      const state = controller.state$.getValue();
      expect(state.customId).toBe('doc123');
      expect(state.customDocIdToLoad).toBe('doc123');
      expect(debouncedLoadDocumentMock).toHaveBeenCalledWith('doc123');
    });

    it('should properly handle null for customDocIdToLoad', () => {
      controller.setCustomDocIdToLoad(null);
      const state = controller.state$.getValue();
      expect(state.customId).toBeUndefined();
      expect(state.customDocIdToLoad).toBeNull();
      expect(debouncedLoadDocumentMock).not.toHaveBeenCalled();
    });
  });
});

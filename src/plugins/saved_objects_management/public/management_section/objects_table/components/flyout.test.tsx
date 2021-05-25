/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  importFileMock,
  importLegacyFileMock,
  resolveImportErrorsMock,
  resolveIndexPatternConflictsMock,
  resolveSavedObjectsMock,
  resolveSavedSearchesMock,
  saveObjectsMock,
} from './flyout.test.mocks';

import React from 'react';
import { shallowWithI18nProvider } from '@kbn/test/jest';
import { coreMock, httpServiceMock } from '../../../../../../core/public/mocks';
import { serviceRegistryMock } from '../../../services/service_registry.mock';
import { Flyout, FlyoutProps, FlyoutState } from './flyout';
import { ShallowWrapper } from 'enzyme';
import { dataPluginMock } from '../../../../../data/public/mocks';

const mockFile = ({
  name: 'foo.ndjson',
  path: '/home/foo.ndjson',
} as unknown) as File;
const legacyMockFile = ({
  name: 'foo.json',
  path: '/home/foo.json',
} as unknown) as File;

describe('Flyout', () => {
  let defaultProps: FlyoutProps;

  const shallowRender = (props: FlyoutProps) => {
    return (shallowWithI18nProvider(<Flyout {...props} />) as unknown) as ShallowWrapper<
      FlyoutProps,
      FlyoutState,
      Flyout
    >;
  };

  beforeEach(() => {
    const { http, overlays } = coreMock.createStart();
    const search = dataPluginMock.createStartContract().search;
    const basePath = httpServiceMock.createBasePath();

    defaultProps = {
      close: jest.fn(),
      done: jest.fn(),
      newIndexPatternUrl: '',
      indexPatterns: {
        getCache: jest.fn().mockImplementation(() => [
          { id: '1', attributes: {} },
          { id: '2', attributes: {} },
        ]),
      } as any,
      overlays,
      http,
      allowedTypes: ['search', 'index-pattern', 'visualization'],
      serviceRegistry: serviceRegistryMock.create(),
      search,
      basePath,
    };
  });

  it('should render import step', async () => {
    const component = shallowRender(defaultProps);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component).toMatchSnapshot();
  });

  it('should allow picking a file', async () => {
    const component = shallowRender(defaultProps);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    expect(component.state('file')).toBe(undefined);
    component.find('EuiFilePicker').simulate('change', [mockFile]);
    expect(component.state('file')).toBe(mockFile);
  });

  it('should allow removing a file', async () => {
    const component = shallowRender(defaultProps);

    // Ensure all promises resolve
    await Promise.resolve();
    // Ensure the state changes are reflected
    component.update();

    expect(component.state('file')).toBe(undefined);
    component.find('EuiFilePicker').simulate('change', [mockFile]);
    expect(component.state('file')).toBe(mockFile);
    component.find('EuiFilePicker').simulate('change', []);
    expect(component.state('file')).toBe(undefined);
  });

  it('should handle invalid files', async () => {
    const component = shallowRender(defaultProps);

    // Ensure all promises resolve
    await new Promise((resolve) => process.nextTick(resolve));
    // Ensure the state changes are reflected
    component.update();

    importLegacyFileMock.mockImplementation(() => {
      throw new Error('foobar');
    });

    await component.instance().legacyImport();
    expect(component.state('error')).toBe('The file could not be processed.');

    importLegacyFileMock.mockImplementation(() => ({
      invalid: true,
    }));

    await component.instance().legacyImport();
    expect(component.state('error')).toBe(
      'Saved objects file format is invalid and cannot be imported.'
    );
  });

  describe('conflicts', () => {
    beforeEach(() => {
      importFileMock.mockImplementation(() => ({
        success: false,
        successCount: 0,
        errors: [
          {
            id: '1',
            type: 'visualization',
            title: 'My Visualization',
            error: {
              type: 'missing_references',
              references: [
                {
                  id: 'MyIndexPattern*',
                  type: 'index-pattern',
                },
              ],
            },
          },
        ],
      }));
      resolveImportErrorsMock.mockImplementation(() => ({
        status: 'success',
        importCount: 1,
        failedImports: [],
      }));
    });

    it('should figure out unmatchedReferences', async () => {
      const component = shallowRender(defaultProps);

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.setState({ file: mockFile, isLegacyFile: false });
      await component.instance().import();

      expect(importFileMock).toHaveBeenCalledWith(defaultProps.http, mockFile, {
        createNewCopies: false,
        overwrite: true,
      });
      expect(component.state()).toMatchObject({
        conflictedIndexPatterns: undefined,
        conflictedSavedObjectsLinkedToSavedSearches: undefined,
        conflictedSearchDocs: undefined,
        importCount: 0,
        status: 'idle',
        error: undefined,
        unmatchedReferences: [
          {
            existingIndexPatternId: 'MyIndexPattern*',
            newIndexPatternId: undefined,
            list: [
              {
                id: '1',
                type: 'visualization',
                title: 'My Visualization',
              },
            ],
          },
        ],
      });
    });

    it('should allow conflict resolution', async () => {
      const component = shallowRender(defaultProps);

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.setState({ file: mockFile, isLegacyFile: false });
      await component.instance().import();

      // Ensure it looks right
      component.update();
      expect(component).toMatchSnapshot();

      // Ensure we can change the resolution
      component.instance().onIndexChanged('MyIndexPattern*', { target: { value: '2' } });
      expect(component.state('unmatchedReferences')![0].newIndexPatternId).toBe('2');

      // Let's resolve now
      await component
        .find('EuiButton[data-test-subj="importSavedObjectsConfirmBtn"]')
        .simulate('click');
      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      expect(resolveImportErrorsMock).toMatchSnapshot();
    });
  });

  describe('summary', () => {
    it('should display summary when import is complete', async () => {
      const component = shallowRender(defaultProps);

      // Ensure all promises resolve
      await Promise.resolve();
      // Ensure the state changes are reflected
      component.update();

      importFileMock.mockImplementation(() => ({
        success: false,
        successCount: 0,
      }));
      const failedImports = Symbol();
      const successfulImports = Symbol();
      resolveImportErrorsMock.mockImplementation(() => ({
        status: 'success',
        importCount: 0,
        failedImports,
        successfulImports,
      }));

      component.setState({ file: mockFile, isLegacyFile: false });

      // Go through the import flow
      await component.instance().import();
      component.update();

      // Ensure all promises resolve
      await Promise.resolve();

      expect(component.state('status')).toBe('success');
      expect(component.find('EuiFlyout ImportSummary')).toMatchSnapshot();
      const cancelButton = await component.find(
        'EuiButtonEmpty[data-test-subj="importSavedObjectsCancelBtn"]'
      );
      expect(cancelButton.prop('disabled')).toBe(true);
    });
  });

  describe('legacy conflicts', () => {
    const mockData = [
      {
        _id: '1',
        _type: 'search',
      },
      {
        _id: '2',
        _type: 'index-pattern',
      },
      {
        _id: '3',
        _type: 'invalid',
      },
    ];

    const mockConflictedIndexPatterns = [
      {
        doc: {
          _type: 'index-pattern',
          _id: '1',
          _source: {
            title: 'MyIndexPattern*',
          },
        },
        obj: {
          searchSource: {
            getOwnField: (field: string) => {
              if (field === 'index') {
                return 'MyIndexPattern*';
              }
              if (field === 'filter') {
                return [{ meta: { index: 'filterIndex' } }];
              }
            },
          },
          _serialize: () => {
            return { references: [{ id: 'MyIndexPattern*' }, { id: 'filterIndex' }] };
          },
        },
      },
    ];

    const mockConflictedSavedObjectsLinkedToSavedSearches = [2];
    const mockConflictedSearchDocs = [3];

    beforeEach(() => {
      importLegacyFileMock.mockImplementation(() => mockData);
      resolveSavedObjectsMock.mockImplementation(() => ({
        conflictedIndexPatterns: mockConflictedIndexPatterns,
        conflictedSavedObjectsLinkedToSavedSearches: mockConflictedSavedObjectsLinkedToSavedSearches,
        conflictedSearchDocs: mockConflictedSearchDocs,
        importedObjectCount: 2,
        confirmModalPromise: () => {},
      }));
    });

    it('should figure out unmatchedReferences', async () => {
      const component = shallowRender(defaultProps);

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.setState({ file: legacyMockFile, isLegacyFile: true });
      await component.instance().legacyImport();

      expect(importLegacyFileMock).toHaveBeenCalledWith(legacyMockFile);
      // Remove the last element from data since it should be filtered out
      expect(resolveSavedObjectsMock).toHaveBeenCalledWith(
        mockData.slice(0, 2).map((doc) => ({ ...doc, _migrationVersion: {} })),
        true,
        defaultProps.serviceRegistry.all().map((s) => s.service),
        defaultProps.indexPatterns,
        defaultProps.overlays.openConfirm
      );

      expect(component.state()).toMatchObject({
        conflictedIndexPatterns: mockConflictedIndexPatterns,
        conflictedSavedObjectsLinkedToSavedSearches: mockConflictedSavedObjectsLinkedToSavedSearches,
        conflictedSearchDocs: mockConflictedSearchDocs,
        importCount: 2,
        status: 'idle',
        error: undefined,
        unmatchedReferences: [
          {
            existingIndexPatternId: 'MyIndexPattern*',
            newIndexPatternId: undefined,
            list: [
              {
                id: 'MyIndexPattern*',
                title: 'MyIndexPattern*',
                type: 'index-pattern',
              },
            ],
          },
          {
            existingIndexPatternId: 'filterIndex',
            list: [
              {
                id: 'filterIndex',
                title: 'MyIndexPattern*',
                type: 'index-pattern',
              },
            ],
            newIndexPatternId: undefined,
          },
        ],
      });
    });

    it('should allow conflict resolution', async () => {
      const component = shallowRender(defaultProps);

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      component.setState({ file: legacyMockFile, isLegacyFile: true });
      await component.instance().legacyImport();

      // Ensure it looks right
      component.update();
      expect(component).toMatchSnapshot();

      // Ensure we can change the resolution
      component.instance().onIndexChanged('MyIndexPattern*', { target: { value: '2' } });
      expect(component.state('unmatchedReferences')![0].newIndexPatternId).toBe('2');

      // Let's resolve now
      await component
        .find('EuiButton[data-test-subj="importSavedObjectsConfirmBtn"]')
        .simulate('click');
      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      expect(resolveIndexPatternConflictsMock).toHaveBeenCalledWith(
        component.instance().resolutions,
        mockConflictedIndexPatterns,
        true,
        {
          search: defaultProps.search,
          indexPatterns: defaultProps.indexPatterns,
        }
      );
      expect(saveObjectsMock).toHaveBeenCalledWith(
        mockConflictedSavedObjectsLinkedToSavedSearches,
        true
      );
      expect(resolveSavedSearchesMock).toHaveBeenCalledWith(
        mockConflictedSearchDocs,
        defaultProps.serviceRegistry.all().map((s) => s.service),
        defaultProps.indexPatterns,
        true
      );
    });

    it('should handle errors', async () => {
      const component = shallowRender(defaultProps);

      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));
      // Ensure the state changes are reflected
      component.update();

      resolveIndexPatternConflictsMock.mockImplementation(() => {
        throw new Error('foobar');
      });

      component.setState({ file: legacyMockFile, isLegacyFile: true });

      // Go through the import flow
      await component.instance().legacyImport();
      component.update();
      // Set a resolution
      component.instance().onIndexChanged('MyIndexPattern*', { target: { value: '2' } });
      await component
        .find('EuiButton[data-test-subj="importSavedObjectsConfirmBtn"]')
        .simulate('click');
      // Ensure all promises resolve
      await new Promise((resolve) => process.nextTick(resolve));

      expect(component.state('error')).toMatchInlineSnapshot(
        `"The file could not be processed due to error: \\"foobar\\""`
      );
      expect(component.find('EuiFlyoutBody EuiCallOut')).toMatchSnapshot();
    });
  });
});

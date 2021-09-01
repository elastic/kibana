/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { importFileMock, resolveImportErrorsMock } from './flyout.test.mocks';

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

      component.setState({ file: mockFile });
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

      component.setState({ file: mockFile });
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

      component.setState({ file: mockFile });

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
});

/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import '../../../models/legacy_core_editor/legacy_core_editor.test.mocks';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';
import React from 'react';
import { mount, ReactWrapper } from 'enzyme';

import { FileTreeEntry } from '../../../components/file_tree/file_tree_entry';

import { serviceContextMock } from '../../../contexts/services_context.mock';
import {
  TextObjectsContextProvider,
  ServicesContextProvider,
  ContextValue,
} from '../../../contexts';

import { FileTree } from '../file_tree';

import { createHelpers } from './helpers';

describe('File Tree', () => {
  let serviceContext: ContextValue;
  let component: ReactWrapper;
  let helpers: ReturnType<typeof createHelpers>;

  beforeEach(() => {
    serviceContext = serviceContextMock.create();
    component = doMount();
    helpers = createHelpers(component);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const doMount = () =>
    mount(
      <ServicesContextProvider value={serviceContext}>
        <TextObjectsContextProvider>
          <FileTree />
        </TextObjectsContextProvider>
      </ServicesContextProvider>
    );

  it('renders', () => {
    // Empty file tree
    expect(component).toMatchSnapshot();
  });

  const DEFAULT_CREATE_ATTRIBUTES = {
    id: 'test',
    name: 'test',
    createdAt: 123,
    updatedAt: 123,
  };

  it('creates a new file', async () => {
    const { createTestFile, fileEntryExists } = helpers;
    const name1 = 'test';
    const name2 = 'anotherTest';
    (serviceContext.services.objectStorageClient.text.create as jest.Mock)
      .mockResolvedValueOnce({
        ...DEFAULT_CREATE_ATTRIBUTES,
        id: name1,
        name: name1,
      })
      .mockResolvedValueOnce({
        ...DEFAULT_CREATE_ATTRIBUTES,
        id: name2,
        name: name2,
      });

    expect(component.find(FileTreeEntry).length).toBe(0);
    await createTestFile();

    component.update();
    expect(component.find(FileTreeEntry).length).toBe(1);
    expect(fileEntryExists(name1)).toBe(true);
    expect(fileEntryExists(name2)).toBe(false);

    await createTestFile();

    component.update();
    expect(component.find(FileTreeEntry).length).toBe(2);
    expect(fileEntryExists(name2)).toBe(true);
  });

  it('edits a file name', async () => {
    const { createTestFile, editFile, getFileEntry } = helpers;
    const oldName = 'test';
    const newName = 'test2';
    (serviceContext.services.objectStorageClient.text.create as jest.Mock).mockResolvedValue({
      ...DEFAULT_CREATE_ATTRIBUTES,
      id: 'test',
      name: oldName,
    });
    (serviceContext.services.objectStorageClient.text.update as jest.Mock).mockResolvedValue({
      ...DEFAULT_CREATE_ATTRIBUTES,
      id: 'test',
      name: newName,
    });

    expect(component.find(FileTreeEntry).length).toBe(0);

    await createTestFile();
    component.update();

    await editFile(oldName, newName);
    component.update();

    expect(component.find(FileTreeEntry).length).toBe(1);
    expect(getFileEntry(newName).text()).toBe(newName);
  });

  it('deletes a file', async () => {
    const { createTestFile, deleteFile, fileEntryExists } = helpers;
    const name1 = 'test';
    const name2 = 'scratchpad'; // This name is overridden with 'Default'
    expect(findTestSubject(component, `consoleModalDeleteFileButton-${name1}`).exists()).toBe(
      false
    );
    (serviceContext.services.objectStorageClient.text.create as jest.Mock)
      .mockResolvedValueOnce({
        ...DEFAULT_CREATE_ATTRIBUTES,
        id: name1,
        name: name1,
      })
      .mockResolvedValueOnce({
        ...DEFAULT_CREATE_ATTRIBUTES,
        id: name2,
        name: name2,
        isScratchPad: true,
      });

    await createTestFile();
    await createTestFile();

    component.update();
    expect(findTestSubject(component, `consoleDeleteFileButton-${name1}`).exists()).toBe(true);
    // The default text object should not have a delete button!
    expect(findTestSubject(component, `consoleDeleteFileButton-${name2}`).exists()).toBe(false);

    await deleteFile(name1);
    component.update();

    expect(component.find(FileTreeEntry).length).toBe(1);
    expect(fileEntryExists(name1)).toBe(false);
    expect(fileEntryExists('Default')).toBe(true);
  });

  it('shows errors', async () => {
    const { createTestFile, editFile, getFileErrorIcon } = helpers;
    const name1 = 'test';
    const newName1 = 'testAgain';
    const name2 = 'anotherTest';
    (serviceContext.services.objectStorageClient.text.create as jest.Mock)
      .mockResolvedValueOnce({
        ...DEFAULT_CREATE_ATTRIBUTES,
        id: name1,
        name: name1,
      })
      .mockResolvedValueOnce({
        ...DEFAULT_CREATE_ATTRIBUTES,
        id: name2,
        name: name2,
        isScratchPad: true,
      });

    (serviceContext.services.objectStorageClient.text.update as jest.Mock).mockRejectedValueOnce(
      new Error('something is wrong!')
    );

    await createTestFile();
    await createTestFile();
    component.update();
    await editFile(name1, newName1);
    component.update();

    expect(getFileErrorIcon(newName1).exists()).toBe(true);
    expect(getFileErrorIcon(name1).exists()).toBe(false);
    expect(getFileErrorIcon(name2).exists()).toBe(false);
  });
});

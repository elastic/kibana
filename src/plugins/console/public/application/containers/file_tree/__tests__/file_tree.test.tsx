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
import React from 'react';
import { mount } from 'enzyme';

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

  beforeEach(() => {
    serviceContext = serviceContextMock.create();
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
    doMount();
  });

  it('creates a new file', async () => {
    (serviceContext.services.objectStorageClient.text.create as jest.Mock).mockResolvedValue({
      id: 'test',
      name: 'test',
    });
    const component = doMount();
    expect(component.exists('.conApp__fileTree__entry')).toBe(false);
    const { createFile } = createHelpers(component);
    await createFile();
    component.update();
    expect(component.exists('.conApp__fileTree__entry')).toBe(true);
  });
});

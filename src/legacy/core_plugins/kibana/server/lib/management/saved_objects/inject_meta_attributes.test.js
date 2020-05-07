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

import { injectMetaAttributes } from './inject_meta_attributes';

function getManagementMock(savedObjectSchemas) {
  return {
    isImportAndExportable(type) {
      return (
        !savedObjectSchemas[type] || savedObjectSchemas[type].isImportableAndExportable !== false
      );
    },
    getDefaultSearchField(type) {
      return savedObjectSchemas[type] && savedObjectSchemas[type].defaultSearchField;
    },
    getIcon(type) {
      return savedObjectSchemas[type] && savedObjectSchemas[type].icon;
    },
    getTitle(savedObject) {
      const { type } = savedObject;
      const getTitle = savedObjectSchemas[type] && savedObjectSchemas[type].getTitle;
      if (getTitle) {
        return getTitle(savedObject);
      }
    },
    getEditUrl(savedObject) {
      const { type } = savedObject;
      const getEditUrl = savedObjectSchemas[type] && savedObjectSchemas[type].getEditUrl;
      if (getEditUrl) {
        return getEditUrl(savedObject);
      }
    },
    getInAppUrl(savedObject) {
      const { type } = savedObject;
      const getInAppUrl = savedObjectSchemas[type] && savedObjectSchemas[type].getInAppUrl;
      if (getInAppUrl) {
        return getInAppUrl(savedObject);
      }
    },
  };
}

test('works when no schema is defined for the type', () => {
  const savedObject = { type: 'a' };
  const savedObjectsManagement = getManagementMock({});
  const result = injectMetaAttributes(savedObject, savedObjectsManagement);
  expect(result).toEqual({ type: 'a', meta: {} });
});

test('inject icon into meta attribute', () => {
  const savedObject = {
    type: 'a',
  };
  const savedObjectsManagement = getManagementMock({
    a: {
      icon: 'my-icon',
    },
  });
  const result = injectMetaAttributes(savedObject, savedObjectsManagement);
  expect(result).toEqual({
    type: 'a',
    meta: {
      icon: 'my-icon',
    },
  });
});

test('injects title into meta attribute', () => {
  const savedObject = {
    type: 'a',
  };
  const savedObjectsManagement = getManagementMock({
    a: {
      getTitle() {
        return 'my-title';
      },
    },
  });
  const result = injectMetaAttributes(savedObject, savedObjectsManagement);
  expect(result).toEqual({
    type: 'a',
    meta: {
      title: 'my-title',
    },
  });
});

test('injects editUrl into meta attribute', () => {
  const savedObject = {
    type: 'a',
  };
  const savedObjectsManagement = getManagementMock({
    a: {
      getEditUrl() {
        return 'my-edit-url';
      },
    },
  });
  const result = injectMetaAttributes(savedObject, savedObjectsManagement);
  expect(result).toEqual({
    type: 'a',
    meta: {
      editUrl: 'my-edit-url',
    },
  });
});

test('injects inAppUrl meta attribute', () => {
  const savedObject = {
    type: 'a',
  };
  const savedObjectsManagement = getManagementMock({
    a: {
      getInAppUrl() {
        return {
          path: 'my-in-app-url',
          uiCapabilitiesPath: 'ui.path',
        };
      },
    },
  });
  const result = injectMetaAttributes(savedObject, savedObjectsManagement);
  expect(result).toEqual({
    type: 'a',
    meta: {
      inAppUrl: {
        path: 'my-in-app-url',
        uiCapabilitiesPath: 'ui.path',
      },
    },
  });
});

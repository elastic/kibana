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

import { Inspector } from './inspector';
jest.mock('./view_registry', () => ({
  viewRegistry: {
    getVisible: jest.fn(),
  },
}));
jest.mock('./ui/inspector_panel', () => ({
  InspectorPanel: () => 'InspectorPanel',
}));
jest.mock('ui/i18n', () => ({ I18nContext: ({ children }) => children }));

jest.mock('ui/new_platform', () => ({
  npStart: {
    core: {
      overlay: {
        openFlyout: jest.fn(),
      },
    }
  },
}));

import { viewRegistry } from './view_registry';

function setViews(views) {
  viewRegistry.getVisible.mockImplementation(() => views);
}

describe('Inspector', () => {
  describe('isAvailable()', () => {
    it('should return false if no view would be available', () => {
      setViews([]);
      expect(Inspector.isAvailable({})).toBe(false);
    });

    it('should return true if views would be available', () => {
      setViews([{}]);
      expect(Inspector.isAvailable({})).toBe(true);
    });
  });

  describe('open()', () => {
    it('should throw an error if no views available', () => {
      setViews([]);
      expect(() => Inspector.open({})).toThrow();
    });
  });
});

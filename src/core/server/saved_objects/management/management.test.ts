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

import { SavedObjectsManagement } from './management';

describe('isImportAndExportable()', () => {
  it('returns false for unknown types', () => {
    const management = new SavedObjectsManagement();
    const result = management.isImportAndExportable('bar');
    expect(result).toBe(false);
  });

  it('returns true for explicitly importable and exportable type', () => {
    const management = new SavedObjectsManagement({
      foo: {
        isImportableAndExportable: true,
      },
    });
    const result = management.isImportAndExportable('foo');
    expect(result).toBe(true);
  });

  it('returns false for explicitly importable and exportable type', () => {
    const management = new SavedObjectsManagement({
      foo: {
        isImportableAndExportable: false,
      },
    });
    const result = management.isImportAndExportable('foo');
    expect(result).toBe(false);
  });
});

describe('getDefaultSearchField()', () => {
  it('returns empty for unknown types', () => {
    const management = new SavedObjectsManagement();
    const result = management.getDefaultSearchField('bar');
    expect(result).toEqual(undefined);
  });

  it('returns explicit value', () => {
    const management = new SavedObjectsManagement({
      foo: {
        defaultSearchField: 'value',
      },
    });
    const result = management.getDefaultSearchField('foo');
    expect(result).toEqual('value');
  });
});

describe('getIcon', () => {
  it('returns empty for unknown types', () => {
    const management = new SavedObjectsManagement();
    const result = management.getIcon('bar');
    expect(result).toEqual(undefined);
  });

  it('returns explicit value', () => {
    const management = new SavedObjectsManagement({
      foo: {
        icon: 'value',
      },
    });
    const result = management.getIcon('foo');
    expect(result).toEqual('value');
  });
});

describe('getTitle', () => {
  it('returns empty for unknown type', () => {
    const management = new SavedObjectsManagement();
    const result = management.getTitle({
      id: '1',
      type: 'foo',
      attributes: {},
      references: [],
    });
    expect(result).toEqual(undefined);
  });

  it('returns explicit value', () => {
    const management = new SavedObjectsManagement({
      foo: {
        getTitle() {
          return 'called';
        },
      },
    });
    const result = management.getTitle({
      id: '1',
      type: 'foo',
      attributes: {},
      references: [],
    });
    expect(result).toEqual('called');
  });
});

describe('getEditUrl()', () => {
  it('returns empty for unknown type', () => {
    const management = new SavedObjectsManagement();
    const result = management.getEditUrl({
      id: '1',
      type: 'foo',
      attributes: {},
      references: [],
    });
    expect(result).toEqual(undefined);
  });

  it('returns explicit value', () => {
    const management = new SavedObjectsManagement({
      foo: {
        getEditUrl() {
          return 'called';
        },
      },
    });
    const result = management.getEditUrl({
      id: '1',
      type: 'foo',
      attributes: {},
      references: [],
    });
    expect(result).toEqual('called');
  });
});

describe('getInAppUrl()', () => {
  it('returns empty array for unknown type', () => {
    const management = new SavedObjectsManagement();
    const result = management.getInAppUrl({
      id: '1',
      type: 'foo',
      attributes: {},
      references: [],
    });
    expect(result).toEqual(undefined);
  });

  it('returns explicit value', () => {
    const management = new SavedObjectsManagement({
      foo: {
        getInAppUrl() {
          return { path: 'called', uiCapabilitiesPath: 'my.path' };
        },
      },
    });
    const result = management.getInAppUrl({
      id: '1',
      type: 'foo',
      attributes: {},
      references: [],
    });
    expect(result).toEqual({ path: 'called', uiCapabilitiesPath: 'my.path' });
  });
});

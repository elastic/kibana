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

import expect from '@kbn/expect';
import { findRelationships } from '../management/saved_objects/relationships';

function getSchemaMock(savedObjectSchemas) {
  return {
    isImportAndExportable(type) {
      return !savedObjectSchemas[type] || savedObjectSchemas[type].isImportableAndExportable !== false;
    },
    getTitleSearchField(type) {
      return savedObjectSchemas[type] && savedObjectSchemas[type].titleSearchField;
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

const savedObjectsSchema = getSchemaMock({
  'index-pattern': {
    icon: 'indexPatternApp',
    titleSearchField: 'title',
    getTitle(obj) {
      return obj.attributes.title;
    },
    getEditUrl(obj) {
      return `/management/kibana/index_patterns/${obj.id}`;
    },
    getInAppUrl(obj) {
      return `/app/kibana#/management/kibana/index_patterns/${obj.id}`;
    },
  },
  visualization: {
    icon: 'visualizeApp',
    titleSearchField: 'title',
    getTitle(obj) {
      return obj.attributes.title;
    },
    getEditUrl(obj) {
      return `/management/kibana/objects/savedVisualizations/${obj.id}`;
    },
    getInAppUrl(obj) {
      return `/app/kibana#/visualize/edit/${obj.id}`;
    },
  },
  search: {
    icon: 'search',
    titleSearchField: 'title',
    getTitle(obj) {
      return obj.attributes.title;
    },
    getEditUrl(obj) {
      return `/management/kibana/objects/savedSearches/${obj.id}`;
    },
    getInAppUrl(obj) {
      return `/app/kibana#/discover/${obj.id}`;
    },
  },
  dashboard: {
    icon: 'dashboardApp',
    titleSearchField: 'title',
    getTitle(obj) {
      return obj.attributes.title;
    },
    getEditUrl(obj) {
      return `/management/kibana/objects/savedDashboards/${obj.id}`;
    },
    getInAppUrl(obj) {
      return `/app/kibana#/dashboard/${obj.id}`;
    },
  },
});

describe('findRelationships', () => {
  it('should find relationships for dashboards', async () => {
    const type = 'dashboard';
    const id = 'foo';
    const size = 10;

    const savedObjectsClient = {
      get: () => ({
        attributes: {
          panelsJSON: JSON.stringify([{ panelRefName: 'panel_0' }, { panelRefName: 'panel_1' }, { panelRefName: 'panel_2' }]),
        },
        references: [{
          name: 'panel_0',
          type: 'visualization',
          id: '1',
        }, {
          name: 'panel_1',
          type: 'visualization',
          id: '2',
        }, {
          name: 'panel_2',
          type: 'visualization',
          id: '3',
        }],
      }),
      bulkGet: () => ({ saved_objects: [] }),
      find: () => ({
        saved_objects: [
          {
            id: '1',
            type: 'visualization',
            attributes: {
              title: 'Foo',
            },
          },
          {
            id: '2',
            type: 'visualization',
            attributes: {
              title: 'Bar',
            },
          },
          {
            id: '3',
            type: 'visualization',
            attributes: {
              title: 'FooBar',
            },
          },
        ],
      })
    };
    const result = await findRelationships(
      type,
      id,
      {
        size,
        savedObjectsClient,
        savedObjectsSchema,
        savedObjectTypes: ['dashboard', 'visualization', 'search', 'index-pattern'],
      },
    );
    expect(result).to.eql([
      {
        id: '1',
        type: 'visualization',
        relationship: 'parent',
        meta: {
          icon: 'visualizeApp',
          title: 'Foo',
          editUrl: '/management/kibana/objects/savedVisualizations/1',
          inAppUrl: '/app/kibana#/visualize/edit/1',
        },
      },
      {
        id: '2',
        type: 'visualization',
        relationship: 'parent',
        meta: {
          icon: 'visualizeApp',
          title: 'Bar',
          editUrl: '/management/kibana/objects/savedVisualizations/2',
          inAppUrl: '/app/kibana#/visualize/edit/2',
        },
      },
      {
        id: '3',
        type: 'visualization',
        relationship: 'parent',
        meta: {
          icon: 'visualizeApp',
          title: 'FooBar',
          editUrl: '/management/kibana/objects/savedVisualizations/3',
          inAppUrl: '/app/kibana#/visualize/edit/3',
        },
      },
    ]);
  });

  it('should find relationships for visualizations', async () => {
    const type = 'visualization';
    const id = 'foo';
    const size = 10;

    const savedObjectsClient = {
      get: () => ({
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            }),
          },
        },
        references: [{
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: '1',
        }],
      }),
      bulkGet: () => ({
        saved_objects: [
          {
            id: '1',
            type: 'index-pattern',
            attributes: {
              title: 'My Index Pattern',
            },
          },
        ],
      }),
      find: () => ({
        saved_objects: [
          {
            id: '1',
            type: 'dashboard',
            attributes: {
              title: 'My Dashboard',
              panelsJSON: JSON.stringify([
                {
                  type: 'visualization',
                  id,
                },
                {
                  type: 'visualization',
                  id: 'foobar',
                },
              ]),
            },
          },
          {
            id: '2',
            type: 'dashboard',
            attributes: {
              title: 'Your Dashboard',
              panelsJSON: JSON.stringify([
                {
                  type: 'visualization',
                  id,
                },
                {
                  type: 'visualization',
                  id: 'foobar',
                },
              ]),
            },
          },
        ]
      })
    };

    const result = await findRelationships(
      type,
      id,
      {
        size,
        savedObjectsClient,
        savedObjectsSchema,
        savedObjectTypes: ['dashboard', 'visualization', 'search', 'index-pattern'],
      },
    );
    expect(result).to.eql([
      {
        id: '1',
        type: 'index-pattern',
        relationship: 'child',
        meta:
        {
          icon: 'indexPatternApp',
          title: 'My Index Pattern',
          editUrl: '/management/kibana/index_patterns/1',
          inAppUrl: '/app/kibana#/management/kibana/index_patterns/1',
        },
      },
      {
        id: '1',
        type: 'dashboard',
        relationship: 'parent',
        meta:
        {
          icon: 'dashboardApp',
          title: 'My Dashboard',
          editUrl: '/management/kibana/objects/savedDashboards/1',
          inAppUrl: '/app/kibana#/dashboard/1',
        },
      },
      {
        id: '2',
        type: 'dashboard',
        relationship: 'parent',
        meta:
        {
          icon: 'dashboardApp',
          title: 'Your Dashboard',
          editUrl: '/management/kibana/objects/savedDashboards/2',
          inAppUrl: '/app/kibana#/dashboard/2',
        },
      },
    ]);
  });

  it('should find relationships for saved searches', async () => {
    const type = 'search';
    const id = 'foo';
    const size = 10;

    const savedObjectsClient = {
      get: () => ({
        id: '1',
        type: 'search',
        attributes: {
          kibanaSavedObjectMeta: {
            searchSourceJSON: JSON.stringify({
              indexRefName: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            }),
          },
        },
        references: [{
          name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
          type: 'index-pattern',
          id: '1',
        }],
      }),
      bulkGet: () => ({
        saved_objects: [
          {
            id: '1',
            type: 'index-pattern',
            attributes: {
              title: 'My Index Pattern',
            },
          },
        ],
      }),
      find: () => ({
        saved_objects: [
          {
            id: '1',
            type: 'visualization',
            attributes: {
              title: 'Foo',
            },
          },
          {
            id: '2',
            type: 'visualization',
            attributes: {
              title: 'Bar',
            },
          },
          {
            id: '3',
            type: 'visualization',
            attributes: {
              title: 'FooBar',
            },
          },
        ]
      })
    };

    const result = await findRelationships(
      type,
      id,
      {
        size,
        savedObjectsClient,
        savedObjectsSchema,
        savedObjectTypes: ['dashboard', 'visualization', 'search', 'index-pattern'],
      },
    );
    expect(result).to.eql([
      {
        id: '1',
        type: 'index-pattern',
        relationship: 'child',
        meta:
        {
          icon: 'indexPatternApp',
          title: 'My Index Pattern',
          editUrl: '/management/kibana/index_patterns/1',
          inAppUrl: '/app/kibana#/management/kibana/index_patterns/1',
        },
      },
      {
        id: '1',
        type: 'visualization',
        relationship: 'parent',
        meta:
        {
          icon: 'visualizeApp',
          title: 'Foo',
          editUrl: '/management/kibana/objects/savedVisualizations/1',
          inAppUrl: '/app/kibana#/visualize/edit/1',
        },
      },
      {
        id: '2',
        type: 'visualization',
        relationship: 'parent',
        meta:
        {
          icon: 'visualizeApp',
          title: 'Bar',
          editUrl: '/management/kibana/objects/savedVisualizations/2',
          inAppUrl: '/app/kibana#/visualize/edit/2',
        },
      },
      {
        id: '3',
        type: 'visualization',
        relationship: 'parent',
        meta:
        {
          icon: 'visualizeApp',
          title: 'FooBar',
          editUrl: '/management/kibana/objects/savedVisualizations/3',
          inAppUrl: '/app/kibana#/visualize/edit/3',
        },
      },
    ]);
  });

  it('should find relationships for index patterns', async () => {
    const type = 'index-pattern';
    const id = 'foo';
    const size = 10;

    const savedObjectsClient = {
      get: () => ({
        id: '1',
        type: 'index-pattern',
        attributes: {
          title: 'My Index Pattern'
        },
      }),
      find: () => ({
        saved_objects: [
          {
            id: '1',
            type: 'visualization',
            attributes: {
              title: 'Foo',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: 'foo',
                }),
              },
            },
          },
          {
            id: '2',
            type: 'visualization',
            attributes: {
              title: 'Bar',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: 'foo',
                }),
              },
            },
          },
          {
            id: '3',
            type: 'visualization',
            attributes: {
              title: 'FooBar',
              kibanaSavedObjectMeta: {
                searchSourceJSON: JSON.stringify({
                  index: 'foo2',
                }),
              },
            },
          },
          {
            id: '1',
            type: 'search',
            attributes: {
              title: 'My Saved Search',
            },
          },
        ],
      }),
    };

    const result = await findRelationships(
      type,
      id,
      {
        size,
        savedObjectsClient,
        savedObjectsSchema,
        savedObjectTypes: ['dashboard', 'visualization', 'search', 'index-pattern'],
      },
    );
    expect(result).to.eql([
      {
        id: '1',
        type: 'visualization',
        relationship: 'parent',
        meta:
        {
          icon: 'visualizeApp',
          title: 'Foo',
          editUrl: '/management/kibana/objects/savedVisualizations/1',
          inAppUrl: '/app/kibana#/visualize/edit/1',
        },
      },
      {
        id: '2',
        type: 'visualization',
        relationship: 'parent',
        meta:
        {
          icon: 'visualizeApp',
          title: 'Bar',
          editUrl: '/management/kibana/objects/savedVisualizations/2',
          inAppUrl: '/app/kibana#/visualize/edit/2',
        },
      },
      {
        id: '3',
        type: 'visualization',
        relationship: 'parent',
        meta:
        {
          icon: 'visualizeApp',
          title: 'FooBar',
          editUrl: '/management/kibana/objects/savedVisualizations/3',
          inAppUrl: '/app/kibana#/visualize/edit/3',
        },
      },
      {
        id: '1',
        type: 'search',
        relationship: 'parent',
        meta:
        {
          icon: 'search',
          title: 'My Saved Search',
          editUrl: '/management/kibana/objects/savedSearches/1',
          inAppUrl: '/app/kibana#/discover/1',
        },
      },
    ]);
  });

  it('should return an empty object for non related objects', async () => {
    const type = 'invalid';
    const id = 'foo';
    const size = 10;

    const savedObjectsClient = {
      get: () => ({
        id: '1',
        type: 'index-pattern',
        attributes: {
          title: 'My Index Pattern',
        },
        references: [],
      }),
      find: () => ({ saved_objects: [] }),
    };

    const result = await findRelationships(
      type,
      id,
      {
        size,
        savedObjectsClient,
        savedObjectsSchema,
        savedObjectTypes: ['dashboard', 'visualization', 'search', 'index-pattern'],
      },
    );
    expect(result).to.eql({});
  });
});

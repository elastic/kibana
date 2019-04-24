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

function getManagementaMock(savedObjectSchemas) {
  return {
    isImportAndExportable(type) {
      return !savedObjectSchemas[type] || savedObjectSchemas[type].isImportableAndExportable !== false;
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

const savedObjectsManagement = getManagementaMock({
  'index-pattern': {
    icon: 'indexPatternApp',
    defaultSearchField: 'title',
    getTitle(obj) {
      return obj.attributes.title;
    },
    getEditUrl(obj) {
      return encodeURIComponent(`/management/kibana/index_patterns/${obj.id}`);
    },
    getInAppUrl(obj) {
      return {
        path: encodeURIComponent(`/app/kibana#/management/kibana/index_patterns/${obj.id}`),
        uiCapabilitiesPath: 'management.kibana.index_patterns',
      };
    },
  },
  visualization: {
    icon: 'visualizeApp',
    defaultSearchField: 'title',
    getTitle(obj) {
      return obj.attributes.title;
    },
    getEditUrl(obj) {
      return encodeURIComponent(`/management/kibana/objects/savedVisualizations/${obj.id}`);
    },
    getInAppUrl(obj) {
      return {
        path: encodeURIComponent(`/app/kibana#/visualize/edit/${obj.id}`),
        uiCapabilitiesPath: 'visualize.show',
      };
    },
  },
  search: {
    icon: 'search',
    defaultSearchField: 'title',
    getTitle(obj) {
      return obj.attributes.title;
    },
    getEditUrl(obj) {
      return encodeURIComponent(`/management/kibana/objects/savedSearches/${obj.id}`);
    },
    getInAppUrl(obj) {
      return {
        path: encodeURIComponent(`/app/kibana#/discover/${obj.id}`),
        uiCapabilitiesPath: 'discover.show',
      };
    },
  },
  dashboard: {
    icon: 'dashboardApp',
    defaultSearchField: 'title',
    getTitle(obj) {
      return obj.attributes.title;
    },
    getEditUrl(obj) {
      return encodeURIComponent(`/management/kibana/objects/savedDashboards/${obj.id}`);
    },
    getInAppUrl(obj) {
      return {
        path: encodeURIComponent(`/app/kibana#/dashboard/${obj.id}`),
        uiCapabilitiesPath: 'dashboard.show',
      };
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
        savedObjectsManagement,
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
          editUrl: '%2Fmanagement%2Fkibana%2Fobjects%2FsavedVisualizations%2F1',
          inAppUrl: {
            path: '%2Fapp%2Fkibana%23%2Fvisualize%2Fedit%2F1',
            uiCapabilitiesPath: 'visualize.show',
          },
        },
      },
      {
        id: '2',
        type: 'visualization',
        relationship: 'parent',
        meta: {
          icon: 'visualizeApp',
          title: 'Bar',
          editUrl: '%2Fmanagement%2Fkibana%2Fobjects%2FsavedVisualizations%2F2',
          inAppUrl: {
            path: '%2Fapp%2Fkibana%23%2Fvisualize%2Fedit%2F2',
            uiCapabilitiesPath: 'visualize.show',
          },
        },
      },
      {
        id: '3',
        type: 'visualization',
        relationship: 'parent',
        meta: {
          icon: 'visualizeApp',
          title: 'FooBar',
          editUrl: '%2Fmanagement%2Fkibana%2Fobjects%2FsavedVisualizations%2F3',
          inAppUrl: {
            path: '%2Fapp%2Fkibana%23%2Fvisualize%2Fedit%2F3',
            uiCapabilitiesPath: 'visualize.show',
          },
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
        savedObjectsManagement,
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
          editUrl: '%2Fmanagement%2Fkibana%2Findex_patterns%2F1',
          inAppUrl: {
            path: '%2Fapp%2Fkibana%23%2Fmanagement%2Fkibana%2Findex_patterns%2F1',
            uiCapabilitiesPath: 'management.kibana.index_patterns',
          },
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
          editUrl: '%2Fmanagement%2Fkibana%2Fobjects%2FsavedDashboards%2F1',
          inAppUrl: {
            path: '%2Fapp%2Fkibana%23%2Fdashboard%2F1',
            uiCapabilitiesPath: 'dashboard.show',
          },
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
          editUrl: '%2Fmanagement%2Fkibana%2Fobjects%2FsavedDashboards%2F2',
          inAppUrl: {
            path: '%2Fapp%2Fkibana%23%2Fdashboard%2F2',
            uiCapabilitiesPath: 'dashboard.show',
          },
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
        savedObjectsManagement,
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
          editUrl: '%2Fmanagement%2Fkibana%2Findex_patterns%2F1',
          inAppUrl: {
            path: '%2Fapp%2Fkibana%23%2Fmanagement%2Fkibana%2Findex_patterns%2F1',
            uiCapabilitiesPath: 'management.kibana.index_patterns',
          },
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
          editUrl: '%2Fmanagement%2Fkibana%2Fobjects%2FsavedVisualizations%2F1',
          inAppUrl: {
            path: '%2Fapp%2Fkibana%23%2Fvisualize%2Fedit%2F1',
            uiCapabilitiesPath: 'visualize.show',
          },
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
          editUrl: '%2Fmanagement%2Fkibana%2Fobjects%2FsavedVisualizations%2F2',
          inAppUrl: {
            path: '%2Fapp%2Fkibana%23%2Fvisualize%2Fedit%2F2',
            uiCapabilitiesPath: 'visualize.show',
          },
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
          editUrl: '%2Fmanagement%2Fkibana%2Fobjects%2FsavedVisualizations%2F3',
          inAppUrl: {
            path: '%2Fapp%2Fkibana%23%2Fvisualize%2Fedit%2F3',
            uiCapabilitiesPath: 'visualize.show',
          },
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
        savedObjectsManagement,
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
          editUrl: '%2Fmanagement%2Fkibana%2Fobjects%2FsavedVisualizations%2F1',
          inAppUrl: {
            path: '%2Fapp%2Fkibana%23%2Fvisualize%2Fedit%2F1',
            uiCapabilitiesPath: 'visualize.show',
          },
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
          editUrl: '%2Fmanagement%2Fkibana%2Fobjects%2FsavedVisualizations%2F2',
          inAppUrl: {
            path: '%2Fapp%2Fkibana%23%2Fvisualize%2Fedit%2F2',
            uiCapabilitiesPath: 'visualize.show',
          },
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
          editUrl: '%2Fmanagement%2Fkibana%2Fobjects%2FsavedVisualizations%2F3',
          inAppUrl: {
            path: '%2Fapp%2Fkibana%23%2Fvisualize%2Fedit%2F3',
            uiCapabilitiesPath: 'visualize.show',
          },
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
          editUrl: '%2Fmanagement%2Fkibana%2Fobjects%2FsavedSearches%2F1',
          inAppUrl: {
            path: '%2Fapp%2Fkibana%23%2Fdiscover%2F1',
            uiCapabilitiesPath: 'discover.show',
          },
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
        savedObjectsManagement,
        savedObjectTypes: ['dashboard', 'visualization', 'search', 'index-pattern'],
      },
    );
    expect(result).to.eql({});
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableTypes, SampleDatasetProvider } from '../lib/sample_dataset_registry_types';
import { SampleDatasetSchema } from '../lib/sample_dataset_schema';
import {
  getDashboardReferenceByIdFromDataset,
  getSampleDatasetsWithSpaceAwareSavedObjects,
  getSpaceAwareSampleDatasets,
} from './utils';

describe('utils', () => {
  describe('getSpaceAwareSampleDatasets', () => {
    const mockSampleDataset = {
      id: `test-sample-data`,
      name: `test-my-space`,
      description: `test-my-space`,
      previewImagePath: `test-my-space`,
      darkPreviewImagePath: `test-my-space`,
      overviewDashboard: `test-my-space-dashboard`,
      defaultIndex: 'test-test-space-index',
      appLinks: [],
      savedObjects: [],
      dataIndices: [],
      statusCheck: jest.fn(),
    };
    const mockSpecProvider = jest.fn(
      (spaceId?: string) => mockSampleDataset
    ) as unknown as SampleDatasetProvider;
    const mockSpecProviders = { [`test-sample-data`]: mockSpecProvider };
    const spaceId = 'my-space';

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return the spec provider ', () => {
      const result = getSpaceAwareSampleDatasets(mockSpecProviders, spaceId);
      expect(result).toEqual({ [mockSampleDataset.id]: mockSampleDataset });
    });
  });

  describe('getDashboardReferenceByIdFromDataset', () => {
    const mockSampleDataset = {
      id: `test-sample-data`,
      name: `test-default`,
      description: `test-default`,
      previewImagePath: `test-default`,
      darkPreviewImagePath: `test-default`,
      overviewDashboard: `test-default-dashboard`,
      appLinks: [],
      savedObjects: [
        {
          id: 'test-dashboard',
          type: 'dashboard',
          attributes: {},
          references: [
            {
              id: 'test-reference',
            },
          ],
        },
      ],
      dataIndices: [],
      statusCheck: jest.fn(),
      defaultIndex: `test-default-index`,
    };

    const sampleDatasets: SampleDatasetSchema[] = [mockSampleDataset];
    const sampleDataId = 'test-sample-data';
    const dashboardId = 'test-dashboard';
    const referenceId = 'test-reference';

    it('should throw an error if the sample dataset is not found', () => {
      expect(() =>
        getDashboardReferenceByIdFromDataset({
          sampleDatasets,
          sampleDataId: 'not-found',
          dashboardId,
          referenceId,
        })
      ).toThrowError('Unable to find sample dataset with id: not-found');
    });

    it('should throw an error if the dashboard is not found', () => {
      expect(() =>
        getDashboardReferenceByIdFromDataset({
          sampleDatasets,
          sampleDataId,
          dashboardId: 'not-found',
          referenceId,
        })
      ).toThrowError('Unable to find dashboard with id: not-found');
    });

    it('should throw an error if the reference is not found', () => {
      expect(() =>
        getDashboardReferenceByIdFromDataset({
          sampleDatasets,
          sampleDataId,
          dashboardId,
          referenceId: 'not-found',
        })
      ).toThrowError('Unable to find reference for embeddable: not-found');
    });

    it('should return the sample dataset, dashboard, and reference', () => {
      const result = getDashboardReferenceByIdFromDataset({
        sampleDatasets,
        sampleDataId,
        dashboardId,
        referenceId,
      });
      expect(result).toEqual({
        sampleDataset: mockSampleDataset,
        dashboard: mockSampleDataset.savedObjects[0],
        reference: mockSampleDataset.savedObjects[0].references[0],
      });
    });
  });

  describe('getSampleDatasetsWithSpaceAwareSavedObjects', () => {
    it('should return the space aware sample datasets', () => {
      const additionalSampleDataSavedObjects = [
        {
          id: 'blah',
          type: 'blah',
          attributes: {},
          references: [
            {
              id: 'blah',
            },
          ],
        },
      ];
      const mockSampleDataset = {
        id: `test-sample-data`,
        name: `test-default`,
        description: `test-default`,
        previewImagePath: `test-default`,
        darkPreviewImagePath: `test-default`,
        overviewDashboard: `test-default-dashboard`,
        appLinks: [],
        savedObjects: [
          {
            id: 'test-dashboard',
            type: 'dashboard',
            attributes: {},
            references: [
              {
                id: 'new-test-reference',
              },
            ],
          },
        ].concat(additionalSampleDataSavedObjects),
        dataIndices: [],
        statusCheck: jest.fn(),
        defaultIndex: `test-default-index`,
      };

      const mockSpaceAwareSampleDataset = {
        id: `test-sample-data`,
        name: `test-current-space`,
        description: `test-current-space`,
        previewImagePath: `test-current-space`,
        darkPreviewImagePath: `test-current-space`,
        overviewDashboard: `test-current-space-dashboard`,
        appLinks: [],
        savedObjects: [
          {
            id: 'test-dashboard',
            type: 'dashboard',
            attributes: {},
            references: [
              {
                id: 'test-reference',
                type: 'visualization',
              },
            ],
          },
        ],
        dataIndices: [],
        statusCheck: jest.fn(),
        defaultIndex: `test-current-space-index`,
      };

      const sampleDatasets: SampleDatasetSchema[] = [mockSampleDataset];

      const result = getSampleDatasetsWithSpaceAwareSavedObjects({
        sampleDatasets,
        spaceAwareSampleDataset: mockSpaceAwareSampleDataset,
        panelReplacementRecords: [
          {
            sampleDataId: 'test-sample-data',
            dashboardId: 'test-dashboard',
            oldEmbeddableId: 'test-reference',
            embeddableId: 'new-test-reference',
            embeddableType: EmbeddableTypes.VISUALIZE_EMBEDDABLE_TYPE,
            embeddableConfig: { config: 'test' },
          },
        ],
        additionalSampleDataSavedObjects,
      });
      expect(result).toMatchInlineSnapshot(`
        Array [
          Object {
            "appLinks": Array [],
            "darkPreviewImagePath": "test-current-space",
            "dataIndices": Array [],
            "defaultIndex": "test-current-space-index",
            "description": "test-current-space",
            "id": "test-sample-data",
            "name": "test-current-space",
            "overviewDashboard": "test-current-space-dashboard",
            "previewImagePath": "test-current-space",
            "savedObjects": Array [
              Object {
                "attributes": Object {},
                "id": "test-dashboard",
                "references": Array [
                  Object {
                    "id": "new-test-reference",
                  },
                ],
                "type": "dashboard",
              },
              Object {
                "attributes": Object {},
                "id": "blah",
                "references": Array [
                  Object {
                    "id": "blah",
                  },
                ],
                "type": "blah",
              },
            ],
            "statusCheck": [MockFunction],
          },
        ]
      `);
    });
  });
});

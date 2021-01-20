/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { findRelationships } from './find_relationships';
import { managementMock } from '../services/management.mock';
import { savedObjectsClientMock } from '../../../../core/server/mocks';

describe('findRelationships', () => {
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let managementService: ReturnType<typeof managementMock.create>;

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    managementService = managementMock.create();
  });

  it('returns the child and parent references of the object', async () => {
    const type = 'dashboard';
    const id = 'some-id';
    const references = [
      {
        type: 'some-type',
        id: 'ref-1',
        name: 'ref 1',
      },
      {
        type: 'another-type',
        id: 'ref-2',
        name: 'ref 2',
      },
    ];
    const referenceTypes = ['some-type', 'another-type'];

    savedObjectsClient.get.mockResolvedValue({
      id,
      type,
      attributes: {},
      references,
    });

    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          type: 'some-type',
          id: 'ref-1',
          attributes: {},
          references: [],
        },
        {
          type: 'another-type',
          id: 'ref-2',
          attributes: {},
          references: [],
        },
      ],
    });

    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [
        {
          type: 'parent-type',
          id: 'parent-id',
          attributes: {},
          score: 1,
          references: [],
        },
      ],
      total: 1,
      per_page: 20,
      page: 1,
    });

    const relationships = await findRelationships({
      type,
      id,
      size: 20,
      client: savedObjectsClient,
      referenceTypes,
      savedObjectsManagement: managementService,
    });

    expect(savedObjectsClient.get).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.get).toHaveBeenCalledWith(type, id);

    expect(savedObjectsClient.bulkGet).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.bulkGet).toHaveBeenCalledWith(
      references.map((ref) => ({
        id: ref.id,
        type: ref.type,
      }))
    );

    expect(savedObjectsClient.find).toHaveBeenCalledTimes(1);
    expect(savedObjectsClient.find).toHaveBeenCalledWith({
      hasReference: { type, id },
      perPage: 20,
      type: referenceTypes,
    });

    expect(relationships).toEqual([
      {
        id: 'ref-1',
        relationship: 'child',
        type: 'some-type',
        meta: expect.any(Object),
      },
      {
        id: 'ref-2',
        relationship: 'child',
        type: 'another-type',
        meta: expect.any(Object),
      },
      {
        id: 'parent-id',
        relationship: 'parent',
        type: 'parent-type',
        meta: expect.any(Object),
      },
    ]);
  });

  it('uses the management service to consolidate the relationship objects', async () => {
    const type = 'dashboard';
    const id = 'some-id';
    const references = [
      {
        type: 'some-type',
        id: 'ref-1',
        name: 'ref 1',
      },
    ];
    const referenceTypes = ['some-type', 'another-type'];

    managementService.getIcon.mockReturnValue('icon');
    managementService.getTitle.mockReturnValue('title');
    managementService.getEditUrl.mockReturnValue('editUrl');
    managementService.getInAppUrl.mockReturnValue({
      path: 'path',
      uiCapabilitiesPath: 'uiCapabilitiesPath',
    });

    savedObjectsClient.get.mockResolvedValue({
      id,
      type,
      attributes: {},
      references,
    });

    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        {
          type: 'some-type',
          id: 'ref-1',
          attributes: {},
          references: [],
        },
      ],
    });

    savedObjectsClient.find.mockResolvedValue({
      saved_objects: [],
      total: 0,
      per_page: 20,
      page: 1,
    });

    const relationships = await findRelationships({
      type,
      id,
      size: 20,
      client: savedObjectsClient,
      referenceTypes,
      savedObjectsManagement: managementService,
    });

    expect(managementService.getIcon).toHaveBeenCalledTimes(1);
    expect(managementService.getTitle).toHaveBeenCalledTimes(1);
    expect(managementService.getEditUrl).toHaveBeenCalledTimes(1);
    expect(managementService.getInAppUrl).toHaveBeenCalledTimes(1);

    expect(relationships).toEqual([
      {
        id: 'ref-1',
        relationship: 'child',
        type: 'some-type',
        meta: {
          title: 'title',
          icon: 'icon',
          editUrl: 'editUrl',
          inAppUrl: {
            path: 'path',
            uiCapabilitiesPath: 'uiCapabilitiesPath',
          },
        },
      },
    ]);
  });
});

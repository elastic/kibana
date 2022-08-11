/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObject, SavedObjectError } from '@kbn/core/types';
import type { SavedObjectsFindResponse } from '@kbn/core/server';
import { findRelationships } from './find_relationships';
import { managementMock } from '../services/management.mock';
import { savedObjectsClientMock } from '@kbn/core/server/mocks';

const createObj = (parts: Partial<SavedObject<any>>): SavedObject<any> => ({
  id: 'id',
  type: 'type',
  attributes: {},
  references: [],
  ...parts,
});

const createFindResponse = (objs: SavedObject[]): SavedObjectsFindResponse => ({
  saved_objects: objs.map((obj) => ({ ...obj, score: 1 })),
  total: objs.length,
  per_page: 20,
  page: 1,
});

const createError = (parts: Partial<SavedObjectError>): SavedObjectError => ({
  error: 'error',
  message: 'message',
  metadata: {},
  statusCode: 404,
  ...parts,
});

describe('findRelationships', () => {
  let savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
  let managementService: ReturnType<typeof managementMock.create>;

  beforeEach(() => {
    savedObjectsClient = savedObjectsClientMock.create();
    managementService = managementMock.create();
  });

  it('calls the savedObjectClient APIs with the correct parameters', async () => {
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

    savedObjectsClient.get.mockResolvedValue(
      createObj({
        id,
        type,
        references,
      })
    );
    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        createObj({
          type: 'some-type',
          id: 'ref-1',
        }),
        createObj({
          type: 'another-type',
          id: 'ref-2',
        }),
      ],
    });
    savedObjectsClient.find.mockResolvedValue(
      createFindResponse([
        createObj({
          type: 'parent-type',
          id: 'parent-id',
        }),
      ])
    );

    await findRelationships({
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

    savedObjectsClient.get.mockResolvedValue(
      createObj({
        id,
        type,
        references,
      })
    );
    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        createObj({
          type: 'some-type',
          id: 'ref-1',
        }),
        createObj({
          type: 'another-type',
          id: 'ref-2',
        }),
      ],
    });
    savedObjectsClient.find.mockResolvedValue(
      createFindResponse([
        createObj({
          type: 'parent-type',
          id: 'parent-id',
        }),
      ])
    );

    const { relations, invalidRelations } = await findRelationships({
      type,
      id,
      size: 20,
      client: savedObjectsClient,
      referenceTypes,
      savedObjectsManagement: managementService,
    });

    expect(relations).toEqual([
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
    expect(invalidRelations).toHaveLength(0);
  });

  it('returns the invalid relations', async () => {
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

    savedObjectsClient.get.mockResolvedValue(
      createObj({
        id,
        type,
        references,
      })
    );
    const ref1Error = createError({ message: 'Not found' });
    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        createObj({
          type: 'some-type',
          id: 'ref-1',
          error: ref1Error,
        }),
        createObj({
          type: 'another-type',
          id: 'ref-2',
        }),
      ],
    });
    savedObjectsClient.find.mockResolvedValue(createFindResponse([]));

    const { relations, invalidRelations } = await findRelationships({
      type,
      id,
      size: 20,
      client: savedObjectsClient,
      referenceTypes,
      savedObjectsManagement: managementService,
    });

    expect(relations).toEqual([
      {
        id: 'ref-2',
        relationship: 'child',
        type: 'another-type',
        meta: expect.any(Object),
      },
    ]);

    expect(invalidRelations).toEqual([
      { type: 'some-type', id: 'ref-1', relationship: 'child', error: ref1Error.message },
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

    savedObjectsClient.get.mockResolvedValue(
      createObj({
        id,
        type,
        references,
      })
    );
    savedObjectsClient.bulkGet.mockResolvedValue({
      saved_objects: [
        createObj({
          type: 'some-type',
          id: 'ref-1',
        }),
      ],
    });
    savedObjectsClient.find.mockResolvedValue(createFindResponse([]));

    const { relations } = await findRelationships({
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

    expect(relations).toEqual([
      {
        id: 'ref-1',
        relationship: 'child',
        type: 'some-type',
        meta: {
          title: 'title',
          icon: 'icon',
          editUrl: 'editUrl',
          hiddenType: false,
          inAppUrl: {
            path: 'path',
            uiCapabilitiesPath: 'uiCapabilitiesPath',
          },
        },
      },
    ]);
  });
});

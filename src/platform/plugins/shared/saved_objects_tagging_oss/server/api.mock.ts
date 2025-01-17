/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SavedObjectsClientContract } from '@kbn/core/server';
import { ITagsClient } from '../common';
import {
  AssignmentServiceOptions,
  IAssignmentService,
  SavedObjectsTaggingApiServer,
} from './types';

const createClientMock = () => {
  const mock: jest.Mocked<ITagsClient> = {
    create: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    findByName: jest.fn(),
  };

  return mock;
};

const createAssignmentServiceMock = () => {
  const mock: jest.Mocked<IAssignmentService> = {
    findAssignableObjects: jest.fn(),
    getAssignableTypes: jest.fn(),
    updateTagAssignments: jest.fn(),
  };

  return mock;
};

type SavedObjectsTaggingApiMock = Omit<
  jest.Mocked<SavedObjectsTaggingApiServer>,
  'createTagClient' | 'createInternalAssignmentService'
> & {
  createTagClient: ({ client }: { client: SavedObjectsClientContract }) => jest.Mocked<ITagsClient>;
  createInternalAssignmentService: (
    options: AssignmentServiceOptions
  ) => jest.Mocked<IAssignmentService>;
};

const createApiMock = (): SavedObjectsTaggingApiMock => {
  const mock: SavedObjectsTaggingApiMock = {
    createTagClient: ({ client }) => createClientMock(),
    createInternalAssignmentService: (options) => createAssignmentServiceMock(),
    getTagsFromReferences: jest.fn(),
    convertTagNameToId: jest.fn(),
    replaceTagReferences: jest.fn(),
  };

  return mock;
};

export const taggingApiMock = {
  create: createApiMock,
};

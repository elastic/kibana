/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { SavedObjectsManagement } from './management';

type Management = PublicMethodsOf<SavedObjectsManagement>;
const createManagementMock = () => {
  const mocked: jest.Mocked<Management> = {
    isImportAndExportable: jest.fn().mockReturnValue(true),
    getDefaultSearchField: jest.fn(),
    getIcon: jest.fn(),
    getTitle: jest.fn(),
    getEditUrl: jest.fn(),
    getInAppUrl: jest.fn(),
    getNamespaceType: jest.fn(),
  };
  return mocked;
};

export const managementMock = {
  create: createManagementMock,
};

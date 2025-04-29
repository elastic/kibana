/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    isHidden: jest.fn().mockReturnValue(false),
  };
  return mocked;
};

export const managementMock = {
  create: createManagementMock,
};

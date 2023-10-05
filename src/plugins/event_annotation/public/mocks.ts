/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import { getEventAnnotationService } from './event_annotation_service/service';

// not really mocking but avoiding async loading
export const eventAnnotationServiceMock = getEventAnnotationService(coreMock.createStart(), {
  client: {
    get: jest.fn(),
    search: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
} as unknown as ContentManagementPublicStart);

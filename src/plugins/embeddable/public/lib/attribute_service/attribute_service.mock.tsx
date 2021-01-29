/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { EmbeddableInput, SavedObjectEmbeddableInput } from '../index';
import { coreMock } from '../../../../../core/public/mocks';
import { AttributeServiceOptions } from './attribute_service';
import { CoreStart } from 'src/core/public';
import { AttributeService, ATTRIBUTE_SERVICE_KEY } from './index';

export const mockAttributeService = <
  A extends { title: string },
  V extends EmbeddableInput & { [ATTRIBUTE_SERVICE_KEY]: A } = EmbeddableInput & {
    [ATTRIBUTE_SERVICE_KEY]: A;
  },
  R extends SavedObjectEmbeddableInput = SavedObjectEmbeddableInput
>(
  type: string,
  options: AttributeServiceOptions<A>,
  customCore?: jest.Mocked<CoreStart>
): AttributeService<A, V, R> => {
  const core = customCore ? customCore : coreMock.createStart();
  return new AttributeService<A, V, R>(
    type,
    jest.fn(),
    core.i18n.Context,
    core.notifications.toasts,
    options,
    jest.fn().mockReturnValue(() => ({ getDisplayName: () => type }))
  );
};

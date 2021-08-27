/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreStart } from '../../../../../core/public';
import { coreMock } from '../../../../../core/public/mocks';
import type { SavedObjectEmbeddableInput } from '../../../common/lib/saved_object_embeddable';
import type { EmbeddableInput } from '../../../common/types';
import type { AttributeServiceOptions } from './attribute_service';
import { AttributeService, ATTRIBUTE_SERVICE_KEY } from './attribute_service';

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

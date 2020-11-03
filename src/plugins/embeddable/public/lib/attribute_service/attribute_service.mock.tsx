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

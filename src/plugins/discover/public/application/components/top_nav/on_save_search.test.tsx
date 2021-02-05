/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { showSaveModal } from '../../../../../saved_objects/public';
jest.mock('../../../../../saved_objects/public');

import { onSaveSearch } from './on_save_search';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { savedSearchMock } from '../../../__mocks__/saved_search';
import { DiscoverServices } from '../../../build_services';
import { GetStateReturn } from '../../angular/discover_state';
import { i18nServiceMock } from '../../../../../../core/public/mocks';

test('onSaveSearch', async () => {
  const serviceMock = ({
    core: {
      i18n: i18nServiceMock.create(),
    },
  } as unknown) as DiscoverServices;
  const stateMock = ({} as unknown) as GetStateReturn;

  await onSaveSearch({
    indexPattern: indexPatternMock,
    navigateTo: jest.fn(),
    savedSearch: savedSearchMock,
    services: serviceMock,
    state: stateMock,
  });

  expect(showSaveModal).toHaveBeenCalled();
});

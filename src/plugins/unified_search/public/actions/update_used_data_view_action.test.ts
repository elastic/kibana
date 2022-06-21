/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FilterManager } from '@kbn/data-plugin/public';
import { coreMock } from '@kbn/core/public/mocks';
import { createUpdateUsedDataViewAction } from './update_used_data_view_action';
import { ActionExecutionContext } from '@kbn/ui-actions-plugin/public/actions';

beforeEach(() => jest.resetAllMocks());
const mockUiSettingsForFilterManager = coreMock.createStart().uiSettings;

describe('update used data view action', async () => {
  let context: ActionExecutionContext;
  const trigger = { id: 'UPDATE_USED_DATA_VIEWS_TRIGGER' };

  const action = await createUpdateUsedDataViewAction(
    new FilterManager(mockUiSettingsForFilterManager)
  );

  context = {
    // trigger,
    initialDataView: '',
    newDataView: '',
    usedDataViews: '',
  };

  await action.execute(context);
});

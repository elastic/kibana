/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { shallowWithI18nProvider } from '@kbn/test-jest-helpers';

jest.mock('../../../../saved_objects/public', () => ({
  SavedObjectSaveModal: () => null,
}));

import { DashboardSaveModal } from './save_modal';

test('renders DashboardSaveModal', () => {
  const component = shallowWithI18nProvider(
    <DashboardSaveModal
      onSave={() => {}}
      onClose={() => {}}
      title="dash title"
      description="dash description"
      timeRestore={true}
      showCopyOnSave={true}
    />
  );
  expect(component).toMatchSnapshot(); // eslint-disable-line
});

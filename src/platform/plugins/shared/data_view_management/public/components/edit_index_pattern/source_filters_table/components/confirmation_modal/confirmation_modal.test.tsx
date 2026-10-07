/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DeleteFilterConfirmationModal } from './confirmation_modal';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

describe('Header', () => {
  it('should render normally', () => {
    renderWithI18n(
      <DeleteFilterConfirmationModal
        filterToDeleteValue={'test'}
        onCancelConfirmationModal={() => {}}
        onDeleteFilter={() => {}}
      />
    );

    expect(screen.getByText("Delete field filter 'test'?")).toBeVisible();
  });
});

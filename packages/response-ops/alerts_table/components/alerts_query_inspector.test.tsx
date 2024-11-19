/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';

import { AlertsQueryInspector } from './alerts_query_inspector';

jest.mock('./alerts_query_inspector_modal', () => ({
  ModalInspectQuery: jest.fn(() => <div data-test-subj="mocker-modal" />),
}));

describe('Inspect Button', () => {
  const alertsQuerySnapshot = {
    request: [''],
    response: [''],
  };

  afterEach(() => {
    cleanup();
  });

  test('open Inspect Modal', async () => {
    render(
      <AlertsQueryInspector
        inspectTitle={'Inspect Title'}
        showInspectButton
        alertsQuerySnapshot={alertsQuerySnapshot}
      />
    );
    fireEvent.click(await screen.findByTestId('inspect-icon-button'));

    expect(await screen.findByTestId('mocker-modal')).toBeInTheDocument();
  });
});

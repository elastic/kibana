/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertsQueryInspector } from './alerts_query_inspector';
import { AlertsQueryInspectorModal } from './alerts_query_inspector_modal';

jest.mock('./alerts_query_inspector_modal');
jest
  .mocked(AlertsQueryInspectorModal.type)
  .mockImplementation(() => <div data-test-subj="mocked-modal" />);

describe('AlertsQueryInspector', () => {
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
    await userEvent.click(await screen.findByTestId('inspect-icon-button'));

    expect(await screen.findByTestId('mocked-modal')).toBeInTheDocument();
  });
});

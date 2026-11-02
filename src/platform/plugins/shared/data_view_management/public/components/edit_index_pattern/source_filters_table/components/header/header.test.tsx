/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { Header } from '.';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

describe('Header', () => {
  it('should render normally', () => {
    renderWithI18n(<Header />);

    expect(
      screen.getByText(
        'Field filters can be used to exclude one or more fields when fetching a document. This happens when viewing a document in the Discover app, or with a table displaying results from a Discover session in the Dashboard app. If you have documents with large or unimportant fields you may benefit from filtering those out at this lower level.'
      )
    ).toBeVisible();
    expect(
      screen.getByText(
        'Note that multi-fields will incorrectly appear as matches in the table below. These filters only actually apply to fields in the original source document, so matching multi-fields are not actually being filtered.'
      )
    ).toBeVisible();
  });
});

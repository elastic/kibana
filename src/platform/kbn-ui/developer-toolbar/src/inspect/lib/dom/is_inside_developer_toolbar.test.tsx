/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { render, screen } from '@testing-library/react';
import { isInsideDeveloperToolbar } from './is_inside_developer_toolbar';
import { DEVELOPER_TOOLBAR_ID } from '../constants';

describe('isInsideDeveloperToolbar', () => {
  it('should accept the toolbar, its descendants and the controls it renders through portals', () => {
    render(
      <>
        <div id={DEVELOPER_TOOLBAR_ID}>
          <button data-test-subj="modeButton" />
          {createPortal(<button data-test-subj="settingsModalButton" />, document.body)}
        </div>
        <button data-test-subj="pageButton" />
      </>
    );

    expect(isInsideDeveloperToolbar(screen.getByTestId('modeButton'))).toBe(true);
    expect(isInsideDeveloperToolbar(screen.getByTestId('settingsModalButton'))).toBe(true);
    expect(isInsideDeveloperToolbar(screen.getByTestId('pageButton'))).toBe(false);
    expect(isInsideDeveloperToolbar(null)).toBe(false);
  });
});

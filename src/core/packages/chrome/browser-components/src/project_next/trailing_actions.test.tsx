/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { BehaviorSubject } from 'rxjs';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { createMockChromeComponentsDeps, TestChromeProviders } from '../test_helpers';
import { ProjectNextTrailingActions } from './trailing_actions';

describe('ProjectNextTrailingActions', () => {
  it('renders nothing when no app menu, legacy action menu, or AI button', () => {
    const deps = createMockChromeComponentsDeps();

    const { container } = render(
      <TestChromeProviders deps={deps}>
        <ProjectNextTrailingActions />
      </TestChromeProviders>
    );

    expect(
      container.querySelector('[data-test-subj="chromeProjectNextHeaderTrailing"]')
    ).toBeNull();
  });

  it('renders the trailing region when the AI button slot is set', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const aiButton$ = chrome.next.aiButton.get$() as BehaviorSubject<React.ReactNode | undefined>;
    aiButton$.next(<span data-test-subj="aiButtonTest">AI</span>);

    render(
      <TestChromeProviders deps={deps} chrome={chrome}>
        <ProjectNextTrailingActions />
      </TestChromeProviders>
    );

    expect(screen.getByTestId('chromeProjectNextHeaderTrailing')).toBeInTheDocument();
    expect(screen.getByTestId('aiButtonTest')).toBeInTheDocument();
  });
});

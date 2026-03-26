/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import type { BehaviorSubject } from 'rxjs';
import type { ChromeNextHeaderConfig } from '@kbn/core-chrome-browser';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import { createMockChromeComponentsDeps, TestChromeProviders } from '../test_helpers';
import { ProjectNextGlobalActions } from './global_actions';

describe('ProjectNextGlobalActions', () => {
  it('renders nothing when globalActions is absent', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();

    const { container } = render(
      <TestChromeProviders deps={deps} chrome={chrome}>
        <ProjectNextGlobalActions />
      </TestChromeProviders>
    );

    expect(
      container.querySelector('[data-test-subj="chromeProjectNextHeaderGlobalActions"]')
    ).toBeNull();
  });

  it('renders edit title control when globalActions.editTitle is set', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const onClick = jest.fn();

    (chrome.next.header.get$() as BehaviorSubject<ChromeNextHeaderConfig | undefined>).next({
      title: 'Test',
      globalActions: {
        editTitle: { onClick },
      },
    });

    render(
      <TestChromeProviders deps={deps} chrome={chrome}>
        <ProjectNextGlobalActions />
      </TestChromeProviders>
    );

    expect(screen.getByTestId('chromeProjectNextHeaderGlobalActions')).toBeInTheDocument();
    const btn = screen.getByTestId('chromeProjectNextHeaderGlobalEditTitle');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not invoke onClick when editTitle is disabled', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const onClick = jest.fn();

    (chrome.next.header.get$() as BehaviorSubject<ChromeNextHeaderConfig | undefined>).next({
      title: 'Test',
      globalActions: {
        editTitle: { onClick, disabled: true },
      },
    });

    render(
      <TestChromeProviders deps={deps} chrome={chrome}>
        <ProjectNextGlobalActions />
      </TestChromeProviders>
    );

    const btn = screen.getByTestId('chromeProjectNextHeaderGlobalEditTitle');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders share control when globalActions.share is set', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const onClick = jest.fn();

    (chrome.next.header.get$() as BehaviorSubject<ChromeNextHeaderConfig | undefined>).next({
      title: 'Test',
      globalActions: {
        share: { onClick },
      },
    });

    render(
      <TestChromeProviders deps={deps} chrome={chrome}>
        <ProjectNextGlobalActions />
      </TestChromeProviders>
    );

    expect(screen.getByTestId('chromeProjectNextHeaderGlobalActions')).toBeInTheDocument();
    const btn = screen.getByTestId('chromeProjectNextHeaderGlobalShare');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not invoke share onClick when share is disabled', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();
    const onClick = jest.fn();

    (chrome.next.header.get$() as BehaviorSubject<ChromeNextHeaderConfig | undefined>).next({
      title: 'Test',
      globalActions: {
        share: { onClick, disabled: true },
      },
    });

    render(
      <TestChromeProviders deps={deps} chrome={chrome}>
        <ProjectNextGlobalActions />
      </TestChromeProviders>
    );

    const btn = screen.getByTestId('chromeProjectNextHeaderGlobalShare');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('renders favorite slot when globalActions.favorite is a ReactNode', () => {
    const deps = createMockChromeComponentsDeps();
    const chrome = chromeServiceMock.createStartContract();

    (chrome.next.header.get$() as BehaviorSubject<ChromeNextHeaderConfig | undefined>).next({
      title: 'Test',
      globalActions: {
        favorite: <span data-test-subj="favoriteSlotTest">star</span>,
      },
    });

    render(
      <TestChromeProviders deps={deps} chrome={chrome}>
        <ProjectNextGlobalActions />
      </TestChromeProviders>
    );

    expect(screen.getByTestId('chromeProjectNextHeaderGlobalFavoriteSlot')).toBeInTheDocument();
    expect(screen.getByTestId('favoriteSlotTest')).toBeInTheDocument();
  });
});

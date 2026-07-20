/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import '@testing-library/jest-dom';
import { BehaviorSubject } from 'rxjs';
import { render, screen } from '@testing-library/react';
import { EuiButtonIcon, EuiToolTip } from '@elastic/eui';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import type { ChromeBadge, ChromeBreadcrumb } from '@kbn/core-chrome-browser';
import { TestChromeProviders } from '../test_helpers';
import { useHasChromeAppHeaderContent } from './chrome_app_header';

const HasContent = () => {
  return <span>{useHasChromeAppHeaderContent() ? 'has content' : 'empty'}</span>;
};

describe('useHasChromeAppHeaderContent', () => {
  it('detects app-menu-only registered content', () => {
    const chrome = chromeServiceMock.createStartContract();
    chrome.next.appHeader.set({
      menu: {
        items: [
          {
            id: 'share',
            order: 0,
            label: 'Share',
            iconType: 'share',
            run: jest.fn(),
          },
        ],
      },
    });

    render(
      <TestChromeProviders chrome={chrome}>
        <HasContent />
      </TestChromeProviders>
    );

    expect(screen.getByText('has content')).toBeInTheDocument();
  });

  it('detects favorite-only registered content', () => {
    const chrome = chromeServiceMock.createStartContract();
    chrome.next.appHeader.set({
      favorite: (
        <EuiToolTip content="Favorite" disableScreenReaderOutput>
          <EuiButtonIcon aria-label="Favorite" iconType="starEmpty" onClick={jest.fn()} />
        </EuiToolTip>
      ),
    });

    render(
      <TestChromeProviders chrome={chrome}>
        <HasContent />
      </TestChromeProviders>
    );

    expect(screen.getByText('has content')).toBeInTheDocument();
  });

  it('detects metadata-only registered content', () => {
    const chrome = chromeServiceMock.createStartContract();
    chrome.next.appHeader.set({
      metadata: [{ type: 'text', label: 'Created by: analyst' }],
    });

    render(
      <TestChromeProviders chrome={chrome}>
        <HasContent />
      </TestChromeProviders>
    );

    expect(screen.getByText('has content')).toBeInTheDocument();
  });

  it('detects legacy badge fallback content', () => {
    const chrome = chromeServiceMock.createStartContract();
    chrome.getBadge$.mockReturnValue(
      new BehaviorSubject<ChromeBadge>({ text: 'Technical preview', tooltip: '' })
    );

    render(
      <TestChromeProviders chrome={chrome}>
        <HasContent />
      </TestChromeProviders>
    );

    expect(screen.getByText('has content')).toBeInTheDocument();
  });

  it('ignores breadcrumb back targets that resolve to the current location', () => {
    window.history.replaceState({}, '', '/app/example/page');
    const chrome = chromeServiceMock.createStartContract();
    chrome.project.getBreadcrumbs$.mockReturnValue(
      new BehaviorSubject<ChromeBreadcrumb[]>([
        { text: 'Absolute', href: window.location.href },
        { text: 'Relative', href: 'page' },
        { text: 'Trailing slash', href: '/app/example/page/' },
        { text: 'Current page' },
      ])
    );

    render(
      <TestChromeProviders chrome={chrome}>
        <HasContent />
      </TestChromeProviders>
    );

    expect(screen.getByText('empty')).toBeInTheDocument();
  });

  it('keeps breadcrumb back targets that resolve to a different location', () => {
    window.history.replaceState({}, '', '/app/example/page');
    const chrome = chromeServiceMock.createStartContract();
    chrome.project.getBreadcrumbs$.mockReturnValue(
      new BehaviorSubject<ChromeBreadcrumb[]>([
        { text: 'Parent', href: '/app/example' },
        { text: 'Current page' },
      ])
    );

    render(
      <TestChromeProviders chrome={chrome}>
        <HasContent />
      </TestChromeProviders>
    );

    expect(screen.getByText('has content')).toBeInTheDocument();
  });
});

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
import { EuiButtonIcon } from '@elastic/eui';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import type { ChromeBadge } from '@kbn/core-chrome-browser';
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
      favorite: <EuiButtonIcon aria-label="Favorite" iconType="starEmpty" onClick={jest.fn()} />,
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
});

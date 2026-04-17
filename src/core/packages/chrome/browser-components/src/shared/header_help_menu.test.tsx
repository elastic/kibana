/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';
import type { ChromeHelpExtension } from '@kbn/core-chrome-browser';

import { HeaderHelpMenu } from './header_help_menu';
import { TestChromeProviders, serverlessCoreEnv } from '../test_helpers';

describe('HeaderHelpMenu', () => {
  afterEach(() => jest.clearAllMocks());

  const renderAndOpenMenu = ({
    chrome,
    coreEnv,
  }: {
    chrome?: ReturnType<typeof chromeServiceMock.createStartContract>;
    coreEnv?: typeof serverlessCoreEnv;
  } = {}) => {
    const component = mountWithIntl(
      <TestChromeProviders chrome={chrome} coreEnv={coreEnv}>
        <HeaderHelpMenu />
      </TestChromeProviders>
    );
    component.find('EuiHeaderSectionItemButton').find('button').simulate('click');
    return component;
  };

  test('it only renders the default content', () => {
    const component = renderAndOpenMenu();

    const items = component.find('EuiContextMenuItem');
    const itemTexts = items.map((item) => item.text());

    // First item is the panel title "Help v ..."
    expect(itemTexts.slice(1)).toEqual([
      'Kibana documentation',
      'Ask Elastic',
      'Open an issue in GitHub',
    ]);
  });

  test("it doesn't render the version details when serverless", () => {
    const component = mountWithIntl(
      <TestChromeProviders coreEnv={serverlessCoreEnv}>
        <HeaderHelpMenu />
      </TestChromeProviders>
    );
    expect(component.find('[data-test-subj="kbnVersionString"]').exists()).toBeFalsy();
  });

  test('it renders custom link with onClick and closes menu', () => {
    const onClick = jest.fn();
    const chrome = chromeServiceMock.createStartContract();
    chrome.getHelpExtension$.mockReturnValue(
      new BehaviorSubject<ChromeHelpExtension | undefined>({
        appName: 'Test App',
        links: [
          {
            linkType: 'custom',
            content: 'Keyboard shortcuts',
            iconType: 'keyboard',
            onClick,
          },
        ],
      })
    );

    const component = renderAndOpenMenu({ chrome });

    const customItem = component.findWhere(
      (node) => node.is('EuiContextMenuItem') && node.text() === 'Keyboard shortcuts'
    );
    expect(customItem.exists()).toBeTruthy();
    customItem.simulate('click');
    expect(onClick).toHaveBeenCalled();
  });

  test('it renders the global custom content + the default content', () => {
    const chrome = chromeServiceMock.createStartContract();
    chrome.getGlobalHelpExtensionMenuLinks$.mockReturnValue(
      new BehaviorSubject([
        {
          linkType: 'custom' as const,
          href: 'my-link-2',
          content: 'Some other text for the link',
          priority: 10,
        },
        {
          linkType: 'custom' as const,
          href: 'my-link',
          content: 'Some text for the link',
          'data-test-subj': 'my-test-custom-link',
          priority: 100,
        },
      ])
    );

    const component = renderAndOpenMenu({ chrome });

    // 1 panel title + 2 custom global links + 3 default links
    expect(component.find('EuiContextMenuItem').length).toBe(6);

    expect(component.find('[data-test-subj="my-test-custom-link"]').exists()).toBeTruthy();

    // The first item after the panel title (highest priority) is the custom link
    expect(component.find('EuiContextMenuItem').at(1).prop('data-test-subj')).toBe(
      'my-test-custom-link'
    );
  });

  test('it renders extension section with app name title', () => {
    const chrome = chromeServiceMock.createStartContract();
    chrome.getHelpExtension$.mockReturnValue(
      new BehaviorSubject<ChromeHelpExtension | undefined>({
        appName: 'Security',
        links: [
          {
            linkType: 'documentation',
            href: 'https://example.com/docs',
          },
        ],
      })
    );

    const component = renderAndOpenMenu({ chrome });

    // App name rendered as section title (EuiContextMenuItem)
    const titleEl = component.findWhere(
      (node) => node.is('EuiContextMenuItem') && node.text() === 'Security'
    );
    expect(titleEl.exists()).toBeTruthy();

    // Documentation link rendered
    const docItem = component.findWhere(
      (node) => node.is('EuiContextMenuItem') && node.text() === 'Documentation'
    );
    expect(docItem.exists()).toBeTruthy();
  });
});

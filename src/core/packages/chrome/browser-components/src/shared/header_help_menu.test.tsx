/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps } from 'react';
import { BehaviorSubject, of } from 'rxjs';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';

import { HeaderHelpMenu } from './header_help_menu';

describe('HeaderHelpMenu', () => {
  const application = applicationServiceMock.createInternalStartContract();

  const defaultComponentProps: Pick<
    ComponentProps<typeof HeaderHelpMenu>,
    | 'kibanaVersion'
    | 'docLinks'
    | 'navigateToUrl'
    | 'defaultContentLinks$'
    | 'helpExtension$'
    | 'helpSupportUrl$'
    | 'kibanaDocLink'
    | 'isServerless'
  > = {
    navigateToUrl: application.navigateToUrl,
    kibanaVersion: 'version',
    docLinks: docLinksServiceMock.createStartContract(),
    defaultContentLinks$: of([]),
    helpExtension$: new BehaviorSubject(undefined),
    helpSupportUrl$: new BehaviorSubject(''),
    kibanaDocLink: '',
    isServerless: false,
  };

  test('it only renders the default content', () => {
    const component = mountWithIntl(
      <HeaderHelpMenu {...defaultComponentProps} globalHelpExtensionMenuLinks$={of([])} />
    );

    expect(component.find('EuiButtonEmpty').length).toBe(1); // only the toggle view on/off button
    component.find('EuiButtonEmpty').simulate('click');

    const buttons = component.find('EuiButtonEmpty');
    const buttonTexts = buttons.map((button) => button.text()).filter((text) => text.trim() !== '');

    expect(buttonTexts).toEqual(['Kibana documentation', 'Ask Elastic', 'Open an issue in GitHub']);
  });

  test("it doesn't render the version details when the prop isServerless is true", () => {
    const component = mountWithIntl(
      <HeaderHelpMenu
        {...defaultComponentProps}
        isServerless={true}
        globalHelpExtensionMenuLinks$={of([])}
      />
    );

    expect(component.find('[data-test-subj="kbnVersionString"]').exists()).toBeFalsy();
  });

  test('it renders the global custom content + the default content', () => {
    const component = mountWithIntl(
      <HeaderHelpMenu
        {...defaultComponentProps}
        globalHelpExtensionMenuLinks$={of([
          {
            linkType: 'custom',
            href: 'my-link-2',
            content: 'Some other text for the link',
            priority: 10,
          },
          {
            linkType: 'custom',
            href: 'my-link',
            content: 'Some text for the link',
            'data-test-subj': 'my-test-custom-link',
            priority: 100,
          },
        ])}
      />
    );

    expect(component.find('EuiButtonEmpty').length).toBe(1); // only the toggle view on/off button
    component.find('EuiButtonEmpty').simulate('click');

    // 2 custom global link + 4 default links + the toggle button
    expect(component.find('EuiButtonEmpty').length).toBe(6);

    expect(component.find('[data-test-subj="my-test-custom-link"]').exists()).toBeTruthy();

    // The first global component is the second button (first is the toggle button)
    expect(component.find('EuiButtonEmpty').at(1).prop('data-test-subj')).toBe(
      'my-test-custom-link'
    );
  });
});

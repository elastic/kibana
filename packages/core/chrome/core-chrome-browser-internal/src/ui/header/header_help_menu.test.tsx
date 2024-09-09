/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { BehaviorSubject, of } from 'rxjs';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';

import { HeaderHelpMenu } from './header_help_menu';

describe('HeaderHelpMenu', () => {
  test('it only renders the default content', () => {
    const application = applicationServiceMock.createInternalStartContract();
    const helpExtension$ = new BehaviorSubject(undefined);
    const helpSupportUrl$ = new BehaviorSubject('');

    const component = mountWithIntl(
      <HeaderHelpMenu
        navigateToUrl={application.navigateToUrl}
        globalHelpExtensionMenuLinks$={of([])}
        helpExtension$={helpExtension$}
        helpSupportUrl$={helpSupportUrl$}
        kibanaVersion={'version'}
        kibanaDocLink={''}
        docLinks={docLinksServiceMock.createStartContract()}
        defaultContentLinks$={of([])}
      />
    );

    expect(component.find('EuiButtonEmpty').length).toBe(1); // only the toggle view on/off button
    component.find('EuiButtonEmpty').simulate('click');

    const buttons = component.find('EuiButtonEmpty');
    const buttonTexts = buttons.map((button) => button.text()).filter((text) => text.trim() !== '');

    expect(buttonTexts).toEqual([
      'Kibana documentation',
      'Ask Elastic',
      'Give feedback',
      'Open an issue in GitHub',
    ]);
  });

  test('it renders the global custom content + the default content', () => {
    const application = applicationServiceMock.createInternalStartContract();
    const helpExtension$ = new BehaviorSubject(undefined);
    const helpSupportUrl$ = new BehaviorSubject('');

    const component = mountWithIntl(
      <HeaderHelpMenu
        navigateToUrl={application.navigateToUrl}
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
        helpExtension$={helpExtension$}
        helpSupportUrl$={helpSupportUrl$}
        kibanaVersion={'version'}
        kibanaDocLink={''}
        docLinks={docLinksServiceMock.createStartContract()}
        defaultContentLinks$={of([])}
      />
    );

    expect(component.find('EuiButtonEmpty').length).toBe(1); // only the toggle view on/off button
    component.find('EuiButtonEmpty').simulate('click');

    // 2 custom global link + 4 default links + the toggle button
    expect(component.find('EuiButtonEmpty').length).toBe(7);

    expect(component.find('[data-test-subj="my-test-custom-link"]').exists()).toBeTruthy();

    // The first global component is the second button (first is the toggle button)
    expect(component.find('EuiButtonEmpty').at(1).prop('data-test-subj')).toBe(
      'my-test-custom-link'
    );
  });
});

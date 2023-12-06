/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { render } from '@testing-library/react';

import { cloudMock } from '@kbn/cloud-plugin/public/mocks';
import { sharePluginMock } from '@kbn/share-plugin/public/mocks';
import { I18nStart } from '@kbn/core-i18n-browser';
import { themeServiceMock } from '@kbn/core-theme-browser-mocks';
import { docLinksServiceMock } from '@kbn/core-doc-links-browser-mocks';
import { GuideCard } from './guide_card';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

describe('guide cards', () => {
  test('should render search cards', async () => {
    const { queryByText } = render(
      <GuideCard
        activateGuide={jest.fn()}
        navigateToApp={jest.fn()}
        activeFilter={'search'}
        guidesState={[]}
        openModal={jest.fn()}
        theme={themeServiceMock.createStartContract()}
        i18nStart={{} as unknown as I18nStart}
        url={sharePluginMock.createSetupContract().url}
        cloud={cloudMock.createSetup()}
        docLinks={docLinksServiceMock.createStartContract()}
        navigateToUrl={jest.fn()}
        card={{
          solution: 'search',
          icon: 'pivot',
          title: i18n.translate(
            'guidedOnboardingPackage.gettingStarted.cards.elasticsearchApi.title',
            {
              defaultMessage: 'Connect to the Elasticsearch API',
            }
          ),
          telemetryId: 'onboarding--search--elasticsearchEndpointApi',
          order: 1,
          openEndpointModal: true,
        }}
      />
    );
    expect(await queryByText('Connect to the Elasticsearch API')).toMatchInlineSnapshot(`
      <h3
        style="font-weight: 600;"
      >
        Connect to the Elasticsearch API
      </h3>
    `);
    expect(await queryByText('Detect threats in my data with SIEM')).toMatchInlineSnapshot(`null`);
  });
  test('should render security cards', async () => {
    const { queryByText } = render(
      <GuideCard
        activateGuide={jest.fn()}
        navigateToApp={jest.fn()}
        activeFilter={'security'}
        guidesState={[]}
        openModal={jest.fn()}
        theme={themeServiceMock.createStartContract()}
        i18nStart={{} as unknown as I18nStart}
        url={sharePluginMock.createSetupContract().url}
        cloud={cloudMock.createSetup()}
        docLinks={docLinksServiceMock.createStartContract()}
        navigateToUrl={jest.fn()}
        card={{
          solution: 'security',
          icon: 'securitySignal',
          title: (
            <FormattedMessage
              id="guidedOnboardingPackage.gettingStarted.cards.siemSecurity.title"
              defaultMessage="Detect threats in my {lineBreak} data with SIEM"
              values={{
                lineBreak: <br />,
              }}
            />
          ),
          guideId: 'siem',
          telemetryId: 'onboarding--security--siem',
          order: 3,
        }}
      />
    );

    expect(await queryByText('Detect threats in my data with SIEM')).toMatchInlineSnapshot(`
      <span>
        Detect threats in my 
        <br />
         data with SIEM
      </span>
    `);

    expect(await queryByText('Connect to the Elasticsearch API')).toMatchInlineSnapshot(`null`);
  });
  test('should render observability cards', async () => {
    const { queryByText } = render(
      <GuideCard
        activateGuide={jest.fn()}
        navigateToApp={jest.fn()}
        activeFilter={'observability'}
        guidesState={[]}
        openModal={jest.fn()}
        theme={themeServiceMock.createStartContract()}
        i18nStart={{} as unknown as I18nStart}
        url={sharePluginMock.createSetupContract().url}
        cloud={cloudMock.createSetup()}
        docLinks={docLinksServiceMock.createStartContract()}
        navigateToUrl={jest.fn()}
        card={{
          solution: 'observability',
          icon: 'visBarHorizontal',
          title: i18n.translate(
            'guidedOnboardingPackage.gettingStarted.cards.universalProfilingObservability.title',
            { defaultMessage: 'Optimize my workloads with Universal Profiling' }
          ),
          navigateTo: {
            appId: 'profiling',
            path: '/add-data-instructions',
          },
          telemetryId: 'onboarding--observability--profiling',
          order: 15,
        }}
      />
    );
    expect(await queryByText('Optimize my workloads with Universal Profiling'))
      .toMatchInlineSnapshot(`
      <h3
        style="font-weight: 600;"
      >
        Optimize my workloads with Universal Profiling
      </h3>
    `);

    expect(await queryByText('Connect to the Elasticsearch API')).toMatchInlineSnapshot(`null`);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl, shallowWithIntl } from '@kbn/test-jest-helpers';
import TelemetryManagementSection from './telemetry_management_section';
import { TelemetryService } from '@kbn/telemetry-plugin/public/services';
import { coreMock } from '@kbn/core/public/mocks';
import { render } from '@testing-library/react';
import type { DocLinksStart } from '@kbn/core/public';

describe('TelemetryManagementSectionComponent', () => {
  const coreStart = coreMock.createStart();
  const docLinks = {
    legal: { privacyStatement: 'https://some-host/some-url' },
  } as unknown as DocLinksStart['links'];
  const coreSetup = coreMock.createSetup();

  it('renders as expected', () => {
    const telemetryService = new TelemetryService({
      config: {
        appendServerlessChannelsSuffix: false,
        sendUsageTo: 'staging',
        banner: true,
        allowChangingOptInStatus: true,
        optIn: true,
        sendUsageFrom: 'browser',
        labels: {},
      },
      isScreenshotMode: false,
      reportOptInStatusChange: false,
      currentKibanaVersion: 'mock_kibana_version',
      notifications: coreStart.notifications,
      http: coreSetup.http,
    });

    expect(
      shallowWithIntl(
        <TelemetryManagementSection
          telemetryService={telemetryService}
          showAppliesSettingMessage={true}
          enableSaving={true}
          toasts={coreStart.notifications.toasts}
          docLinks={docLinks}
        />
      )
    ).toMatchSnapshot();
  });

  it('renders null because query does not match the SEARCH_TERMS', () => {
    const telemetryService = new TelemetryService({
      config: {
        appendServerlessChannelsSuffix: false,
        banner: true,
        allowChangingOptInStatus: true,
        optIn: false,
        sendUsageFrom: 'browser',
        sendUsageTo: 'staging',
        labels: {},
      },
      isScreenshotMode: false,
      reportOptInStatusChange: false,
      notifications: coreStart.notifications,
      currentKibanaVersion: 'mock_kibana_version',
      http: coreSetup.http,
    });

    const component = render(
      <React.Suspense fallback={<span>Fallback</span>}>
        <TelemetryManagementSection
          telemetryService={telemetryService}
          showAppliesSettingMessage={false}
          enableSaving={true}
          toasts={coreStart.notifications.toasts}
          docLinks={docLinks}
        />
      </React.Suspense>
    );

    try {
      component.rerender(
        <React.Suspense fallback={<span>Fallback</span>}>
          <TelemetryManagementSection
            telemetryService={telemetryService}
            showAppliesSettingMessage={false}
            enableSaving={true}
            toasts={coreStart.notifications.toasts}
            docLinks={docLinks}
          />
        </React.Suspense>
      );
    } finally {
      component.unmount();
    }
  });

  it('renders because query matches the SEARCH_TERMS', () => {
    const telemetryService = new TelemetryService({
      config: {
        appendServerlessChannelsSuffix: false,
        banner: true,
        allowChangingOptInStatus: true,
        optIn: false,
        sendUsageTo: 'staging',
        sendUsageFrom: 'browser',
        labels: {},
      },
      isScreenshotMode: false,
      reportOptInStatusChange: false,
      notifications: coreStart.notifications,
      currentKibanaVersion: 'mock_kibana_version',
      http: coreSetup.http,
    });

    const component = mountWithIntl(
      <TelemetryManagementSection
        telemetryService={telemetryService}
        showAppliesSettingMessage={false}
        enableSaving={true}
        toasts={coreStart.notifications.toasts}
        docLinks={docLinks}
      />
    );
    try {
      expect(
        component.setProps({ ...component.props(), query: { text: 'TeLEMetry' } }).html()
      ).not.toBe(''); // Renders something.
      // I can't check against snapshot because of https://github.com/facebook/jest/issues/8618
      // expect(component).toMatchSnapshot();

      // It should also render if there is no query at all.
      expect(component.setProps({ ...component.props(), query: {} }).html()).not.toBe('');
    } finally {
      component.unmount();
    }
  });

  it('renders null because allowChangingOptInStatus is false', () => {
    const telemetryService = new TelemetryService({
      config: {
        appendServerlessChannelsSuffix: false,
        banner: true,
        allowChangingOptInStatus: false,
        optIn: true,
        sendUsageTo: 'staging',
        sendUsageFrom: 'browser',
        labels: {},
      },
      isScreenshotMode: false,
      reportOptInStatusChange: false,
      notifications: coreStart.notifications,
      currentKibanaVersion: 'mock_kibana_version',
      http: coreSetup.http,
    });

    const component = mountWithIntl(
      <TelemetryManagementSection
        telemetryService={telemetryService}
        showAppliesSettingMessage={true}
        enableSaving={true}
        toasts={coreStart.notifications.toasts}
        docLinks={docLinks}
      />
    );
    try {
      expect(component).toMatchSnapshot();
      component.setProps({ ...component.props(), query: { text: 'TeLEMetry' } });
    } finally {
      component.unmount();
    }
  });

  it('shows the OptInExampleFlyout', () => {
    const telemetryService = new TelemetryService({
      config: {
        appendServerlessChannelsSuffix: false,
        banner: true,
        allowChangingOptInStatus: true,
        optIn: false,
        sendUsageTo: 'staging',
        sendUsageFrom: 'browser',
        labels: {},
      },
      isScreenshotMode: false,
      reportOptInStatusChange: false,
      notifications: coreStart.notifications,
      currentKibanaVersion: 'mock_kibana_version',
      http: coreSetup.http,
    });

    const component = mountWithIntl(
      <TelemetryManagementSection
        telemetryService={telemetryService}
        showAppliesSettingMessage={false}
        enableSaving={true}
        toasts={coreStart.notifications.toasts}
        docLinks={docLinks}
      />
    );
    try {
      const toggleExampleComponent = component
        .find('FormattedMessage > EuiLink')
        .find('button')
        .at(0);
      const updatedView = toggleExampleComponent.simulate('click');
      updatedView.find('OptInExampleFlyout');
      updatedView.simulate('close');
    } finally {
      component.unmount();
    }
  });

  it('toggles the OptIn button', async () => {
    const telemetryService = new TelemetryService({
      config: {
        appendServerlessChannelsSuffix: false,
        banner: true,
        allowChangingOptInStatus: true,
        optIn: false,
        sendUsageTo: 'staging',
        sendUsageFrom: 'browser',
        labels: {},
      },
      isScreenshotMode: false,
      reportOptInStatusChange: false,
      notifications: coreStart.notifications,
      currentKibanaVersion: 'mock_kibana_version',
      http: coreSetup.http,
    });

    const component = mountWithIntl(
      <TelemetryManagementSection
        telemetryService={telemetryService}
        showAppliesSettingMessage={false}
        enableSaving={true}
        toasts={coreStart.notifications.toasts}
        docLinks={docLinks}
      />
    );
    try {
      const toggleOptInComponent = component.find('Field');
      await expect(
        toggleOptInComponent.prop<TelemetryManagementSection['toggleOptIn']>('handleChange')()
      ).resolves.toBe(true);
      // TODO: Fix `mountWithIntl` types in @kbn/test-jest-helpers to make testing easier
      expect((component.state() as { enabled: boolean }).enabled).toBe(true);
      await expect(
        toggleOptInComponent.prop<TelemetryManagementSection['toggleOptIn']>('handleChange')()
      ).resolves.toBe(true);
      expect((component.state() as { enabled: boolean }).enabled).toBe(false);
      telemetryService.setOptIn = jest.fn().mockRejectedValue(Error('test-error'));
      await expect(
        toggleOptInComponent.prop<TelemetryManagementSection['toggleOptIn']>('handleChange')()
      ).rejects.toStrictEqual(Error('test-error'));
    } finally {
      component.unmount();
    }
  });

  it('test the wrapper (for coverage purposes)', () => {
    const telemetryService = new TelemetryService({
      config: {
        appendServerlessChannelsSuffix: false,
        banner: true,
        allowChangingOptInStatus: false,
        optIn: false,
        sendUsageTo: 'staging',
        sendUsageFrom: 'browser',
        labels: {},
      },
      isScreenshotMode: false,
      reportOptInStatusChange: false,
      notifications: coreStart.notifications,
      currentKibanaVersion: 'mock_kibana_version',
      http: coreSetup.http,
    });

    expect(
      shallowWithIntl(
        <TelemetryManagementSection
          showAppliesSettingMessage={true}
          telemetryService={telemetryService}
          enableSaving={true}
          toasts={coreStart.notifications.toasts}
          docLinks={docLinks}
        />
      ).html()
    ).toMatchSnapshot();
  });
});

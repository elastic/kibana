/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { findTestSubject } from '@elastic/eui/lib/test';
import React from 'react';
import { skip } from 'rxjs/operators';
import { mount } from 'enzyme';

import { I18nProvider } from '@kbn/i18n-react';
import { nextTick } from '@kbn/test-jest-helpers';
import {
  ContactCardEmbeddableFactory,
  CONTACT_CARD_EMBEDDABLE,
} from '@kbn/embeddable-plugin/public/lib/test_samples';

import { DashboardViewport, DashboardViewportProps } from './dashboard_viewport';
import { DashboardContainer } from '../dashboard_container';
import { getSampleDashboardInput } from '../../test_helpers';
import { pluginServices } from '../../../services/plugin_services';

let dashboardContainer: DashboardContainer | undefined;
const DashboardServicesProvider = pluginServices.getContextProvider();

function getProps(props?: Partial<DashboardViewportProps>): {
  props: DashboardViewportProps;
} {
  const embeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
  pluginServices.getServices().embeddable.getEmbeddableFactory = jest
    .fn()
    .mockReturnValue(embeddableFactory);

  const input = getSampleDashboardInput({
    panels: {
      '1': {
        gridData: { x: 0, y: 0, w: 6, h: 6, i: '1' },
        type: CONTACT_CARD_EMBEDDABLE,
        explicitInput: { id: '1' },
      },
      '2': {
        gridData: { x: 6, y: 6, w: 6, h: 6, i: '2' },
        type: CONTACT_CARD_EMBEDDABLE,
        explicitInput: { id: '2' },
      },
    },
  });

  dashboardContainer = new DashboardContainer(input);
  const defaultTestProps: DashboardViewportProps = {
    container: dashboardContainer,
  };

  return {
    props: Object.assign(defaultTestProps, props),
  };
}
// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('renders DashboardViewport', () => {
  const { props } = getProps();
  const component = mount(
    <I18nProvider>
      <DashboardServicesProvider>
        <DashboardViewport {...props} />
      </DashboardServicesProvider>
    </I18nProvider>
  );
  const panels = findTestSubject(component, 'dashboardPanel');
  expect(panels.length).toBe(2);
});

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('renders DashboardViewport with no visualizations', () => {
  const { props } = getProps();
  props.container.updateInput({ panels: {} });
  const component = mount(
    <I18nProvider>
      <DashboardServicesProvider>
        <DashboardViewport {...props} />
      </DashboardServicesProvider>
    </I18nProvider>
  );
  const panels = findTestSubject(component, 'dashboardPanel');
  expect(panels.length).toBe(0);

  component.unmount();
});

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('renders DashboardEmptyScreen', () => {
  const { props } = getProps();
  props.container.updateInput({ panels: {} });
  const component = mount(
    <I18nProvider>
      <DashboardServicesProvider>
        <DashboardViewport {...props} />
      </DashboardServicesProvider>
    </I18nProvider>
  );
  const dashboardEmptyScreenDiv = component.find('.dshDashboardEmptyScreen');
  expect(dashboardEmptyScreenDiv.length).toBe(1);

  component.unmount();
});

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('renders exit full screen button when in full screen mode', async () => {
  const { props } = getProps();
  props.container.updateInput({ isFullScreenMode: true });
  const component = mount(
    <I18nProvider>
      <DashboardServicesProvider>
        <DashboardViewport {...props} />
      </DashboardServicesProvider>
    </I18nProvider>
  );

  expect((component.find('.dshDashboardViewport').childAt(0).type() as any).name).toBe(
    'ExitFullScreenButton'
  );

  props.container.updateInput({ isFullScreenMode: false });
  component.update();
  await nextTick();

  expect((component.find('.dshDashboardViewport').childAt(0).type() as any).name).not.toBe(
    'ExitFullScreenButton'
  );

  component.unmount();
});

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('renders exit full screen button when in full screen mode and empty screen', async () => {
  const { props } = getProps();
  props.container.updateInput({ panels: {}, isFullScreenMode: true });
  const component = mount(
    <I18nProvider>
      <DashboardServicesProvider>
        <DashboardViewport {...props} />
      </DashboardServicesProvider>
    </I18nProvider>
  );
  expect((component.find('.dshDashboardViewport').childAt(0).type() as any).name).toBe(
    'ExitFullScreenButton'
  );

  props.container.updateInput({ isFullScreenMode: false });
  component.update();
  await nextTick();

  expect((component.find('.dshDashboardViewport').childAt(0).type() as any).name).not.toBe(
    'ExitFullScreenButton'
  );

  component.unmount();
});

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('DashboardViewport unmount unsubscribes', (done) => {
  const { props } = getProps();
  const component = mount(
    <I18nProvider>
      <DashboardServicesProvider>
        <DashboardViewport {...props} />
      </DashboardServicesProvider>
    </I18nProvider>
  );
  component.unmount();

  props.container
    .getInput$()
    .pipe(skip(1))
    .subscribe(() => {
      done();
    });

  props.container.updateInput({ panels: {} });
});

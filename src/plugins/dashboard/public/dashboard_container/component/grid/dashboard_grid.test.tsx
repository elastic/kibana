/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// @ts-ignore
import sizeMe from 'react-sizeme';
import React from 'react';
import { skip } from 'rxjs/operators';

import {
  ContactCardEmbeddableFactory,
  CONTACT_CARD_EMBEDDABLE,
} from '@kbn/embeddable-plugin/public/lib/test_samples/embeddables';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { DashboardContainer } from '../..';
import { getSampleDashboardInput } from '../../../mocks';
import { pluginServices } from '../../../services/plugin_services';
import { DashboardGrid, DashboardGridProps } from './dashboard_grid';

let dashboardContainer: DashboardContainer | undefined;
const DashboardServicesProvider = pluginServices.getContextProvider();

function prepare(props?: Partial<DashboardGridProps>) {
  const embeddableFactory = new ContactCardEmbeddableFactory((() => null) as any, {} as any);
  pluginServices.getServices().embeddable.getEmbeddableFactory = jest
    .fn()
    .mockReturnValue(embeddableFactory);

  const initialInput = getSampleDashboardInput({
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
  dashboardContainer = new DashboardContainer(initialInput);
  const defaultTestProps: DashboardGridProps = {
    container: dashboardContainer,
    intl: null as any,
  };

  return {
    props: Object.assign(defaultTestProps, props),
  };
}

beforeAll(() => {
  // sizeme detects the width to be 0 in our test environment. noPlaceholder will mean that the grid contents will
  // get rendered even when width is 0, which will improve our tests.
  sizeMe.noPlaceholders = true;
});

afterAll(() => {
  sizeMe.noPlaceholders = false;
});

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('renders DashboardGrid', () => {
  const { props } = prepare();

  const component = mountWithIntl(
    <DashboardServicesProvider>
      <DashboardGrid {...props} />
    </DashboardServicesProvider>
  );
  const panelElements = component.find('EmbeddableChildPanel');
  expect(panelElements.length).toBe(2);
});

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('renders DashboardGrid with no visualizations', () => {
  const { props } = prepare();
  const component = mountWithIntl(
    <DashboardServicesProvider>
      <DashboardGrid {...props} />
    </DashboardServicesProvider>
  );

  props.container.updateInput({ panels: {} });
  component.update();
  expect(component.find('EmbeddableChildPanel').length).toBe(0);
});

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('DashboardGrid removes panel when removed from container', () => {
  const { props } = prepare();
  const component = mountWithIntl(
    <DashboardServicesProvider>
      <DashboardGrid {...props} />
    </DashboardServicesProvider>
  );

  const originalPanels = props.container.getInput().panels;
  const filteredPanels = { ...originalPanels };
  delete filteredPanels['1'];
  props.container.updateInput({ panels: filteredPanels });
  component.update();
  const panelElements = component.find('EmbeddableChildPanel');
  expect(panelElements.length).toBe(1);
});

// TODO: Reinstate these tests
// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('DashboardGrid renders expanded panel', () => {
  const { props } = prepare();
  const component = mountWithIntl(
    <DashboardServicesProvider>
      <DashboardGrid {...props} />
    </DashboardServicesProvider>
  );

  // props.container.updateInput({ expandedPanelId: '1' });
  component.update();
  // Both panels should still exist in the dom, so nothing needs to be re-fetched once minimized.
  expect(component.find('EmbeddableChildPanel').length).toBe(2);

  expect(
    (component.find('DashboardGridUi').state() as { expandedPanelId?: string }).expandedPanelId
  ).toBe('1');

  // props.container.updateInput({ expandedPanelId: undefined });
  component.update();
  expect(component.find('EmbeddableChildPanel').length).toBe(2);

  expect(
    (component.find('DashboardGridUi').state() as { expandedPanelId?: string }).expandedPanelId
  ).toBeUndefined();
});

// unhandled promise rejection: https://github.com/elastic/kibana/issues/112699
test.skip('DashboardGrid unmount unsubscribes', async (done) => {
  const { props } = prepare();
  const component = mountWithIntl(
    <DashboardServicesProvider>
      <DashboardGrid {...props} />
    </DashboardServicesProvider>
  );

  component.unmount();

  props.container
    .getInput$()
    .pipe(skip(1))
    .subscribe(() => {
      done();
    });

  // props.container.updateInput({ expandedPanelId: '1' });
});

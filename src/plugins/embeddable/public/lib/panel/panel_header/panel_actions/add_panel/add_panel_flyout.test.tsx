/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { AddPanelFlyout } from './add_panel_flyout';
import {
  ContactCardEmbeddableFactory,
  CONTACT_CARD_EMBEDDABLE,
} from '../../../../test_samples/embeddables/contact_card/contact_card_embeddable_factory';
import { HelloWorldContainer } from '../../../../test_samples/embeddables/hello_world_container';
import { ContactCardEmbeddable } from '../../../../test_samples/embeddables/contact_card/contact_card_embeddable';
import { ContainerInput } from '../../../../containers';
import { mountWithIntl as mount } from '@kbn/test-jest-helpers';
import { ReactWrapper } from 'enzyme';
import { coreMock } from '../../../../../../../../core/public/mocks';
import { findTestSubject } from '@elastic/eui/lib/test';
import { embeddablePluginMock } from '../../../../../mocks';

function DummySavedObjectFinder(props: { children: React.ReactNode }) {
  return (
    <div>
      <div>Hello World</div>
      {props.children}
    </div>
  ) as JSX.Element;
}

test('createNewEmbeddable() add embeddable to container', async () => {
  const { setup, doStart } = embeddablePluginMock.createInstance();
  const core = coreMock.createStart();
  const { overlays } = core;
  const contactCardEmbeddableFactory = new ContactCardEmbeddableFactory(
    (() => null) as any,
    overlays
  );
  contactCardEmbeddableFactory.getExplicitInput = () =>
    ({
      firstName: 'foo',
      lastName: 'bar',
    } as any);
  setup.registerEmbeddableFactory(CONTACT_CARD_EMBEDDABLE, contactCardEmbeddableFactory);
  const start = doStart();
  const getEmbeddableFactory = start.getEmbeddableFactory;
  const input: ContainerInput<{ firstName: string; lastName: string }> = {
    id: '1',
    panels: {},
  };
  const container = new HelloWorldContainer(input, { getEmbeddableFactory } as any);
  const onClose = jest.fn();
  const component = mount(
    <AddPanelFlyout
      container={container}
      onClose={onClose}
      getFactory={getEmbeddableFactory}
      getAllFactories={start.getEmbeddableFactories}
      notifications={core.notifications}
      SavedObjectFinder={() => null}
      showCreateNewMenu
    />
  ) as ReactWrapper<unknown, unknown, AddPanelFlyout>;

  // https://github.com/elastic/kibana/issues/64789
  expect(component.exists(EuiFlyout)).toBe(false);

  expect(Object.values(container.getInput().panels).length).toBe(0);
  component.instance().createNewEmbeddable(CONTACT_CARD_EMBEDDABLE);
  await new Promise((r) => setTimeout(r, 1));

  const ids = Object.keys(container.getInput().panels);
  const embeddableId = ids[0];
  const child = container.getChild<ContactCardEmbeddable>(embeddableId);

  expect(child.getInput()).toMatchObject({
    firstName: 'foo',
    lastName: 'bar',
  });
});

test('selecting embeddable in "Create new ..." list calls createNewEmbeddable()', async () => {
  const { setup, doStart } = embeddablePluginMock.createInstance();
  const core = coreMock.createStart();
  const { overlays } = core;
  const contactCardEmbeddableFactory = new ContactCardEmbeddableFactory(
    (() => null) as any,
    overlays
  );
  contactCardEmbeddableFactory.getExplicitInput = () =>
    ({
      firstName: 'foo',
      lastName: 'bar',
    } as any);

  setup.registerEmbeddableFactory(CONTACT_CARD_EMBEDDABLE, contactCardEmbeddableFactory);
  const start = doStart();
  const getEmbeddableFactory = start.getEmbeddableFactory;
  const input: ContainerInput<{ firstName: string; lastName: string }> = {
    id: '1',
    panels: {},
  };
  const container = new HelloWorldContainer(input, { getEmbeddableFactory } as any);
  const onClose = jest.fn();
  const component = mount(
    <AddPanelFlyout
      container={container}
      onClose={onClose}
      getFactory={getEmbeddableFactory}
      getAllFactories={start.getEmbeddableFactories}
      notifications={core.notifications}
      SavedObjectFinder={(props) => <DummySavedObjectFinder {...props} />}
      showCreateNewMenu
    />
  ) as ReactWrapper<any, {}, AddPanelFlyout>;

  const spy = jest.fn();
  component.instance().createNewEmbeddable = spy;

  expect(spy).toHaveBeenCalledTimes(0);

  findTestSubject(component, 'createNew').simulate('click');
  findTestSubject(component, `createNew-${CONTACT_CARD_EMBEDDABLE}`).simulate('click');

  expect(spy).toHaveBeenCalledTimes(1);
});

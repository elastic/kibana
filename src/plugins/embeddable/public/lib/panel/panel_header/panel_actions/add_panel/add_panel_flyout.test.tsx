/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as React from 'react';
import { AddPanelFlyout } from './add_panel_flyout';
import { GetEmbeddableFactory } from '../../../../types';
import {
  ContactCardEmbeddableFactory,
  CONTACT_CARD_EMBEDDABLE,
} from '../../../../test_samples/embeddables/contact_card/contact_card_embeddable_factory';
import { HelloWorldContainer } from '../../../../test_samples/embeddables/hello_world_container';
import { ContactCardEmbeddable } from '../../../../test_samples/embeddables/contact_card/contact_card_embeddable';
import { ContainerInput } from '../../../../containers';
import { mountWithIntl as mount } from 'test_utils/enzyme_helpers';
import { ReactWrapper } from 'enzyme';
import { coreMock } from '../../../../../../../../core/public/mocks';
// @ts-ignore
import { findTestSubject } from '@elastic/eui/lib/test';

function DummySavedObjectFinder(props: { children: React.ReactNode }) {
  return (
    <div>
      <div>Hello World</div>
      {props.children}
    </div>
  ) as JSX.Element;
}

test('createNewEmbeddable() add embeddable to container', async () => {
  const core = coreMock.createStart();
  const { overlays } = core;
  const contactCardEmbeddableFactory = new ContactCardEmbeddableFactory(
    {},
    (() => null) as any,
    overlays
  );
  contactCardEmbeddableFactory.getExplicitInput = () =>
    ({
      firstName: 'foo',
      lastName: 'bar',
    } as any);
  const getEmbeddableFactory: GetEmbeddableFactory = (id: string) => contactCardEmbeddableFactory;
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
      getAllFactories={() => new Set<any>([contactCardEmbeddableFactory]).values()}
      notifications={core.notifications}
      SavedObjectFinder={() => null}
    />
  ) as ReactWrapper<unknown, unknown, AddPanelFlyout>;

  expect(Object.values(container.getInput().panels).length).toBe(0);
  component.instance().createNewEmbeddable(CONTACT_CARD_EMBEDDABLE);
  await new Promise(r => setTimeout(r, 1));

  const ids = Object.keys(container.getInput().panels);
  const embeddableId = ids[0];
  const child = container.getChild<ContactCardEmbeddable>(embeddableId);

  expect(child.getInput()).toMatchObject({
    firstName: 'foo',
    lastName: 'bar',
  });
});

test('selecting embeddable in "Create new ..." list calls createNewEmbeddable()', async () => {
  const core = coreMock.createStart();
  const { overlays } = core;
  const contactCardEmbeddableFactory = new ContactCardEmbeddableFactory(
    {},
    (() => null) as any,
    overlays
  );
  contactCardEmbeddableFactory.getExplicitInput = () =>
    ({
      firstName: 'foo',
      lastName: 'bar',
    } as any);
  const getEmbeddableFactory: GetEmbeddableFactory = (id: string) => contactCardEmbeddableFactory;
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
      getAllFactories={() => new Set<any>([contactCardEmbeddableFactory]).values()}
      notifications={core.notifications}
      SavedObjectFinder={props => <DummySavedObjectFinder {...props} />}
    />
  ) as ReactWrapper<unknown, unknown, AddPanelFlyout>;

  const spy = jest.fn();
  component.instance().createNewEmbeddable = spy;

  expect(spy).toHaveBeenCalledTimes(0);

  findTestSubject(component, 'createNew').simulate('click');
  findTestSubject(component, `createNew-${CONTACT_CARD_EMBEDDABLE}`).simulate('click');

  expect(spy).toHaveBeenCalledTimes(1);
});

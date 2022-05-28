/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EmbeddableChildPanel } from './embeddable_child_panel';
import { CONTACT_CARD_EMBEDDABLE } from '../test_samples/embeddables/contact_card/contact_card_embeddable_factory';
import { SlowContactCardEmbeddableFactory } from '../test_samples/embeddables/contact_card/slow_contact_card_embeddable_factory';
import { HelloWorldContainer } from '../test_samples/embeddables/hello_world_container';
import {
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  ContactCardEmbeddable,
} from '../test_samples/embeddables/contact_card/contact_card_embeddable';
import { inspectorPluginMock } from '@kbn/inspector-plugin/public/mocks';
import { mount } from 'enzyme';
import { embeddablePluginMock, createEmbeddablePanelMock } from '../../mocks';

test('EmbeddableChildPanel renders an embeddable when it is done loading', async () => {
  const inspector = inspectorPluginMock.createStartContract();
  const { setup, doStart } = embeddablePluginMock.createInstance();
  setup.registerEmbeddableFactory(
    CONTACT_CARD_EMBEDDABLE,
    new SlowContactCardEmbeddableFactory({ execAction: (() => null) as any })
  );
  const start = doStart();
  const getEmbeddableFactory = start.getEmbeddableFactory;

  const container = new HelloWorldContainer({ id: 'hello', panels: {} }, {
    getEmbeddableFactory,
  } as any);
  const newEmbeddable = await container.addNewEmbeddable<
    ContactCardEmbeddableInput,
    ContactCardEmbeddableOutput,
    ContactCardEmbeddable
  >(CONTACT_CARD_EMBEDDABLE, {
    firstName: 'Theon',
    lastName: 'Greyjoy',
    id: '123',
  });

  expect(newEmbeddable.id).toBeDefined();

  const testPanel = createEmbeddablePanelMock({
    getAllEmbeddableFactories: start.getEmbeddableFactories,
    getEmbeddableFactory,
    inspector,
  });

  const component = mount(
    <EmbeddableChildPanel
      container={container}
      embeddableId={newEmbeddable.id}
      PanelComponent={testPanel}
    />
  );

  await new Promise((r) => setTimeout(r, 1));
  component.update();

  // Due to the way embeddables mount themselves on the dom node, they are not forced to be
  // react components, and hence, we can't use the usual
  // findTestSubject(component, 'embeddablePanelHeading-HelloTheonGreyjoy');
  expect(
    component
      .getDOMNode()
      .querySelectorAll('[data-test-subj="embeddablePanelHeading-HelloTheonGreyjoy"]').length
  ).toBe(1);
});

test(`EmbeddableChildPanel renders an error message if the factory doesn't exist`, async () => {
  const inspector = inspectorPluginMock.createStartContract();
  const getEmbeddableFactory = () => undefined;
  const container = new HelloWorldContainer(
    {
      id: 'hello',
      panels: { '1': { type: 'idontexist', explicitInput: { id: '1' } } },
    },
    { getEmbeddableFactory } as any
  );

  const testPanel = createEmbeddablePanelMock({ inspector });
  const component = mount(
    <EmbeddableChildPanel container={container} embeddableId={'1'} PanelComponent={testPanel} />
  );

  await new Promise((r) => setTimeout(r, 1));
  component.update();

  expect(
    component.getDOMNode().querySelectorAll('[data-test-subj="embeddableStackError"]').length
  ).toBe(1);
});

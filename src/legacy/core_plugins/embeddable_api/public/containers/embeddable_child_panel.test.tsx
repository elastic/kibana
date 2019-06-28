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

import '../np_core.test.mocks';
import {
  ContactCardEmbeddable,
  ContactCardEmbeddableInput,
  ContactCardEmbeddableOutput,
  HelloWorldContainer,
  CONTACT_CARD_EMBEDDABLE,
} from '../test_samples';
import { embeddableFactories } from '../embeddables/embeddable_factories_registry';
import React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { EmbeddableChildPanel } from './embeddable_child_panel';

test('EmbeddableChildPanel renders an embeddable when it is done loading', async () => {
  const container = new HelloWorldContainer({ id: 'hello', panels: {} }, embeddableFactories);
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

  const component = mountWithIntl(
    <EmbeddableChildPanel.WrappedComponent
      intl={null as any}
      container={container}
      embeddableId={newEmbeddable.id}
    />
  );

  await nextTick();
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
  const container = new HelloWorldContainer(
    {
      id: 'hello',
      panels: { '1': { type: 'idontexist', explicitInput: { id: '1' } } },
    },
    embeddableFactories
  );

  const component = mountWithIntl(
    <EmbeddableChildPanel.WrappedComponent
      intl={null as any}
      container={container}
      embeddableId={'1'}
    />
  );

  await nextTick();
  component.update();

  expect(
    component.getDOMNode().querySelectorAll('[data-test-subj="embeddableStackError"]').length
  ).toBe(1);
});

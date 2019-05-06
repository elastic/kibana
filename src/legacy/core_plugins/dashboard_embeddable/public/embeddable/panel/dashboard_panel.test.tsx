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

jest.mock('ui/metadata', () => ({
  metadata: {
    branch: 'my-metadata-branch',
    version: 'my-metadata-version',
  },
}));

import {
  GreetingEmbeddable,
  GreetingEmbeddableInput,
  GreetingEmbeddableOutput,
} from 'plugins/embeddable_api/__test__';
import { embeddableFactories } from 'plugins/embeddable_api/index';
import { QueryLanguageType, ViewMode } from 'plugins/embeddable_api/types';
import React from 'react';
import { mountWithIntl, nextTick } from 'test_utils/enzyme_helpers';
import { DashboardContainer, DashboardContainerInput } from '../dashboard_container';
import { DashboardPanel } from './dashboard_panel';
import { GREETING_EMBEDDABLE } from 'plugins/embeddable_api/__test__';

function getDashboardContainerInput(): DashboardContainerInput {
  return {
    id: '123',
    viewMode: ViewMode.EDIT,
    filters: [],
    query: {
      language: QueryLanguageType.KUERY,
      query: '',
    },
    timeRange: {
      to: 'now',
      from: 'now-15m',
    },
    useMargins: false,
    title: 'My Test Dashboard',
    isFullScreenMode: false,
    panels: {},
  };
}

test('DashboardPanel renders an embeddable when it is done loading', async () => {
  const container = new DashboardContainer(getDashboardContainerInput(), embeddableFactories);
  const newEmbeddable = await container.addNewEmbeddable<
    GreetingEmbeddableInput,
    GreetingEmbeddableOutput,
    GreetingEmbeddable
  >(GREETING_EMBEDDABLE, {
    firstName: 'Theon',
    lastName: 'Greyjoy',
    id: '123',
  });

  expect(newEmbeddable.id).toBeDefined();

  const component = mountWithIntl(
    <DashboardPanel.WrappedComponent
      intl={null as any}
      container={container}
      embeddableId={newEmbeddable.id}
    />
  );

  await nextTick();
  component.update();

  // Due to the way embeddables mount themselves on the dom node, they are not forced to be
  // react components, and hence, we can't use the usual
  // findTestSubject(component, 'dashboardPanelHeading-HelloTheonGreyjoy');
  expect(
    component
      .getDOMNode()
      .querySelectorAll('[data-test-subj="dashboardPanelHeading-HelloTheonGreyjoy"]').length
  ).toBe(1);
});

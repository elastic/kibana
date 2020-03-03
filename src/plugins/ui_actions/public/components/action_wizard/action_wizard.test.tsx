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

import React from 'react';
import { render, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect'; // TODO: this should be global
import {
  ActionFactory,
  ActionWizard,
  TEST_SUBJ_ACTION_FACTORY_ITEM,
  TEST_SUBJ_SELECTED_ACTION_FACTORY,
} from './action_wizard';
import {
  DashboardDrilldownActionFactory,
  UrlDrilldownActionFactory,
  ACTION_FACTORIES,
  dashboards,
} from './test_data';

// TODO: for some reason global cleanup from RTL doesn't work
// afterEach is not available for it globally during setup
afterEach(cleanup);

test('Pick and configure action', () => {
  const wizardChangeFn = jest.fn();

  const screen = render(
    <ActionWizard actionFactories={ACTION_FACTORIES} onChange={wizardChangeFn} />
  );

  // check that all factories are displayed to pick
  expect(screen.getAllByTestId(TEST_SUBJ_ACTION_FACTORY_ITEM)).toHaveLength(2);

  // select URL one
  fireEvent.click(screen.getByText(/Go to URL/i));

  // check that wizard emitted change event. null means config is invalid. this is because URL is empty string yet
  expect(wizardChangeFn).lastCalledWith(UrlDrilldownActionFactory, null);

  // Input url
  const URL = 'https://elastic.co';
  fireEvent.change(screen.getByLabelText(/url/i), {
    target: { value: URL },
  });

  // check that wizard emitted change event
  expect(wizardChangeFn).lastCalledWith(UrlDrilldownActionFactory, {
    url: URL,
    openInNewTab: false,
  });

  // change to dashboard
  fireEvent.click(screen.getByText(/change/i));
  fireEvent.click(screen.getByText(/Go to Dashboard/i));

  // check that wizard emitted change event
  // null config means it is invalid. This is because no dashboard selected yet
  expect(wizardChangeFn).lastCalledWith(DashboardDrilldownActionFactory, null);

  // Select dashboard
  fireEvent.change(screen.getByLabelText(/Choose destination dashboard/i), {
    target: { value: dashboards[1].id },
  });

  // check that wizard emitted change event
  expect(wizardChangeFn).lastCalledWith(DashboardDrilldownActionFactory, {
    dashboardId: dashboards[1].id,
    useCurrentDashboardDataRange: false,
    useCurrentDashboardFilters: false,
  });
});

test('If only one actions factory is available, then no selection step is rendered and no change button displayed', () => {
  const wizardChangeFn = jest.fn();

  const screen = render(
    <ActionWizard
      actionFactories={[UrlDrilldownActionFactory] as Array<ActionFactory<any, unknown>>}
      onChange={wizardChangeFn}
    />
  );

  // check that no factories are displayed to pick from
  expect(screen.queryByTestId(TEST_SUBJ_ACTION_FACTORY_ITEM)).not.toBeInTheDocument();
  expect(screen.queryByTestId(TEST_SUBJ_SELECTED_ACTION_FACTORY)).toBeInTheDocument();

  // Input url
  const URL = 'https://elastic.co';
  fireEvent.change(screen.getByLabelText(/url/i), {
    target: { value: URL },
  });

  // check that wizard emitted change event
  expect(wizardChangeFn).lastCalledWith(UrlDrilldownActionFactory, {
    url: URL,
    openInNewTab: false,
  });

  // check that can't change to action factory type
  expect(screen.queryByTestId(/change/i)).not.toBeInTheDocument();
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { waitFor } from '@testing-library/react';
import { mount } from 'enzyme';
import type { ReactWrapper } from 'enzyme';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import {
  AdditionalContext,
  AlertsTableFlyoutBaseProps,
  FlyoutSectionProps,
  RenderContext,
} from '../types';
import { DefaultAlertsFlyoutBody } from './default_alerts_flyout';
import { createPartialObjectMock } from '../utils/test';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { AlertsTableContextProvider } from '../contexts/alerts_table_context';

const columns = [
  {
    columnHeaderType: 'not-filtered',
    displayAsText: 'Alert Status',
    id: 'kibana.alert.status',
    initialWidth: 110,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: 'Last updated',
    id: '@timestamp',
    initialWidth: 230,
    schema: 'datetime',
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: 'Duration',
    id: 'kibana.alert.duration.us',
    initialWidth: 116,
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: 'Reason',
    id: 'kibana.alert.reason',
    linkField: '*',
  },
  {
    columnHeaderType: 'not-filtered',
    displayAsText: 'Maintenance windows',
    id: 'kibana.alert.maintenance_window_ids',
    schema: 'string',
    initialWidth: 180,
  },
];

const alert = {
  _id: 'dc80788f-f869-4f14-bedb-950186c9d2f8',
  _index: '.internal.alerts-stack.alerts-default-000001',
  'kibana.alert.status': ['active'],
  'kibana.alert.evaluation.conditions': ['Number of matching documents is NOT greater than 1000'],
  'kibana.alert.rule.producer': ['stackAlerts'],
  'kibana.alert.reason.text': [
    'Document count is 0 in the last 5m in metrics-* data view. Alert when greater than 1000.',
  ],
  'kibana.alert.rule.rule_type_id': ['.es-query'],
  'kibana.alert.evaluation.value': ['0'],
  'kibana.alert.instance.id': ['query matched'],
  'kibana.alert.rule.name': ['Test rule'],
  'event.kind': ['signal'],
  'kibana.alert.title': ["rule 'Test rule' recovered"],
  'kibana.alert.workflow_status': ['open'],
  'kibana.alert.rule.uuid': ['TEST_RULE_UUID'],
  'kibana.alert.reason': [
    'Document count is 0 in the last 5m in metrics-* data view. Alert when greater than 1000.',
  ],
  'kibana.alert.rule.consumer': ['infrastructure'],
  'kibana.alert.action_group': ['query matched'],
  'kibana.alert.rule.category': ['Elasticsearch query'],
  'event.action': ['active'],
  '@timestamp': ['2023-12-22T09:23:08.244Z'],
  'kibana.alert.rule.execution.uuid': ['9ca6fe40-90c0-4e32-9772-025e4de79dd8'],
  'kibana.alert.uuid': ['dc80788f-f869-4f14-bedb-950186c9d2f8'],
  'kibana.space_ids': ['default'],
  'kibana.version': ['8.13.0'],
} as unknown as AlertsTableFlyoutBaseProps['alert'];

const tabsData = [
  { name: 'Overview', subj: 'overviewTab' },
  { name: 'Table', subj: 'tableTab' },
];

const context = createPartialObjectMock<RenderContext<AdditionalContext>>({
  services: {
    http: httpServiceMock.createStartContract(),
    fieldFormats: fieldFormatsMock,
  },
});

describe('DefaultAlertsFlyout', () => {
  let wrapper: ReactWrapper;
  beforeAll(async () => {
    wrapper = mount(
      <AlertsTableContextProvider value={context}>
        <DefaultAlertsFlyoutBody
          {...createPartialObjectMock<FlyoutSectionProps>({
            alert,
            isLoading: false,
            columns,
          })}
        />
      </AlertsTableContextProvider>
    ) as ReactWrapper;
    await waitFor(() => wrapper.update());
  });

  describe('tabs', () => {
    tabsData.forEach(({ name: tab }) => {
      test(`should render the ${tab} tab`, () => {
        expect(
          wrapper
            .find('[data-test-subj="defaultAlertFlyoutTabs"]')
            .find('[role="tablist"]')
            .containsMatchingElement(<span>{tab}</span>)
        ).toBeTruthy();
      });
    });

    test('the Overview tab should be selected by default', () => {
      expect(
        wrapper
          .find('[data-test-subj="defaultAlertFlyoutTabs"]')
          .find('.euiTab-isSelected')
          .first()
          .text()
      ).toEqual('Overview');
    });

    tabsData.forEach(({ subj, name }) => {
      test(`should render the ${name} tab panel`, () => {
        wrapper
          .find('[data-test-subj="defaultAlertFlyoutTabs"]')
          .find('[role="tablist"]')
          .find(`[data-test-subj="${subj}"]`)
          .first()
          .simulate('click');
        expect(
          wrapper
            .find('[data-test-subj="defaultAlertFlyoutTabs"]')
            .find('[role="tabpanel"]')
            .find(`[data-test-subj="${subj}Panel"]`)
            .exists()
        ).toBeTruthy();
      });
    });
  });
});

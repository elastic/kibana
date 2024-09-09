/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { dashboardPluginMock } from '@kbn/dashboard-plugin/public/mocks';
import { embeddablePluginMock } from '@kbn/embeddable-plugin/public/mocks';
import { contentManagementMock } from '@kbn/content-management-plugin/public/mocks';
import { presentationUtilPluginMock } from '@kbn/presentation-util-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { BehaviorSubject } from 'rxjs';
import { getMockPresentationContainer } from '@kbn/presentation-containers/mocks';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { Reference } from '@kbn/content-management-utils';
import { setKibanaServices } from './services/kibana_services';
import { LinksParentApi, LinksSerializedState } from './types';

export const setStubKibanaServices = () => {
  const mockCore = coreMock.createStart();

  const core = {
    ...mockCore,
    application: {
      ...mockCore.application,
      capabilities: {
        ...mockCore.application.capabilities,
        visualize: {
          save: true,
        },
      },
    },
  };

  setKibanaServices(core, {
    dashboard: dashboardPluginMock.createStartContract(),
    embeddable: embeddablePluginMock.createStartContract(),
    contentManagement: contentManagementMock.createStartContract(),
    presentationUtil: presentationUtilPluginMock.createStartContract(core),
    uiActions: uiActionsPluginMock.createStartContract(),
  });
};

export const getMockLinksParentApi = (
  serializedState: LinksSerializedState,
  references?: Reference[]
): LinksParentApi => ({
  ...getMockPresentationContainer(),
  type: 'dashboard',
  filters$: new BehaviorSubject<Filter[] | undefined>(undefined),
  query$: new BehaviorSubject<Query | AggregateQuery | undefined>(undefined),
  timeRange$: new BehaviorSubject<TimeRange | undefined>({
    from: 'now-15m',
    to: 'now',
  }),
  timeslice$: new BehaviorSubject<[number, number] | undefined>(undefined),
  savedObjectId: new BehaviorSubject<string | undefined>('999'),
  hidePanelTitle: new BehaviorSubject<boolean | undefined>(false),
  panelTitle: new BehaviorSubject<string | undefined>('My Dashboard'),
  panelDescription: new BehaviorSubject<string | undefined>(''),
  getSerializedStateForChild: () => ({ rawState: serializedState, references }),
});

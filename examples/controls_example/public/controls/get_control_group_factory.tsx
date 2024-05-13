/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';

import { ControlWidth, CONTROL_GROUP_TYPE } from '@kbn/controls-plugin/common';
import {
  DEFAULT_CONTROL_GROW,
  DEFAULT_CONTROL_WIDTH,
} from '@kbn/controls-plugin/common/control_group/control_group_constants';
import { DataView } from '@kbn/data-views-plugin/common';
import { ReactEmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { Filter } from '@kbn/es-query';
import { ControlGroupApi, ControlGroupState } from './types';

export const getControlGroupEmbeddableFactory = () => {
  const imageEmbeddableFactory: ReactEmbeddableFactory<ControlGroupState, ControlGroupApi> = {
    type: CONTROL_GROUP_TYPE,
    deserializeState: (state) => state.rawState,
    buildEmbeddable: async (initialState, buildApi, uuid) => {
      const dataLoading$ = new BehaviorSubject<boolean | undefined>(true);
      const grow = new BehaviorSubject<boolean>(DEFAULT_CONTROL_GROW);
      const width = new BehaviorSubject<ControlWidth>(DEFAULT_CONTROL_WIDTH);
      const children$ = new BehaviorSubject<{ [key: string]: unknown }>({});
      const filters$ = new BehaviorSubject<Filter[] | undefined>([]);
      const dataViews = new BehaviorSubject<DataView[] | undefined>(undefined);

      const embeddable = buildApi(
        {
          dataLoading: dataLoading$,
          children$,
          onEdit: async () => {
            // TODO: Edit control group settings
          },
          isEditingEnabled: () => true,
          getTypeDisplayName: () => 'Control group', // TODO: i18n
          serializeState: () => {
            // TODO: Serialize the state of all the children
            return {
              rawState: {},
            };
          },
          addNewPanel: (panel) => {
            // TODO: Add a new child control
            return Promise.resolve(undefined);
          },
          removePanel: (panelId) => {
            // TODO: Remove a child control
          },
          replacePanel: async (panelId, newPanel) => {
            // TODO: Replace a child control
            return Promise.resolve(panelId);
          },
          grow,
          width,
          filters$,
          dataViews,
        },
        {}
      );
      return {
        api: embeddable,
        Component: () => {
          return <>Here</>;
        },
      };
    },
  };

  return imageEmbeddableFactory;
};

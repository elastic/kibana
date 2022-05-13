/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect } from 'react';
import type { EventEmitter } from 'events';
import type { DataView } from '@kbn/data-views-plugin/common';
import type {
  VisualizeServices,
  VisualizeAppStateContainer,
  VisualizeEditorVisInstance,
} from '../../types';

export const updateDataView = (visInstance: VisualizeEditorVisInstance, dataView: DataView) => {
  visInstance.vis.data.indexPattern = dataView;
  visInstance.vis.data.searchSource?.setField('index', dataView);
};

export const useDataViewUpdates = (
  services: VisualizeServices,
  eventEmitter: EventEmitter,
  appState: VisualizeAppStateContainer | null,
  visInstance: VisualizeEditorVisInstance | undefined
) => {
  useEffect(() => {
    if (appState) {
      const onDataViewUpdate = async (dataViewId: string) => {
        if (dataViewId && visInstance) {
          const selectedDataView = await services.dataViews.get(dataViewId);

          if (selectedDataView) {
            updateDataView(visInstance, selectedDataView);
            eventEmitter.emit('updateEditor', true);
          }
        }
      };

      eventEmitter.on('updateDataView', onDataViewUpdate);

      return () => {
        eventEmitter.off('updateDataView', onDataViewUpdate);
      };
    }
  }, [appState, eventEmitter, services.dataViews, visInstance]);
};

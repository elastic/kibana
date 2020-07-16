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

import { EventEmitter } from 'events';
import { useEffect, useRef, useState } from 'react';
import { VisualizeInput } from 'src/plugins/visualizations/public';
import { IEditorController, SavedVisInstance, VisualizeServices } from '../../types';
import { getVisualizationInstanceFromInput } from '../get_visualization_instance';
import { getEditBreadcrumbs } from '../breadcrumbs';
import { DefaultEditorController } from '../../../../../vis_default_editor/public';

export const useVisByValue = (
  services: VisualizeServices,
  eventEmitter: EventEmitter,
  isChromeVisible: boolean | undefined,
  visualizationIdFromUrl: string | undefined,
  valueInput?: VisualizeInput
) => {
  const [state, setState] = useState<{
    savedVisInstance?: SavedVisInstance;
    visEditorController?: IEditorController;
  }>({});
  const visEditorRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);
  useEffect(() => {
    const { chrome } = services;
    const getVisInstance = async () => {
      if (!valueInput || loaded.current) {
        return;
      }
      const savedVisInstance = await getVisualizationInstanceFromInput(services, valueInput);
      const { embeddableHandler, vis } = savedVisInstance;
      const Editor = vis.type.editor || DefaultEditorController;
      const visEditorController = new Editor(
        visEditorRef.current,
        vis,
        eventEmitter,
        embeddableHandler
      );

      loaded.current = true;
      setState({
        savedVisInstance,
        visEditorController,
      });
    };

    if (chrome) {
      chrome.setBreadcrumbs(getEditBreadcrumbs());
    }

    getVisInstance();
  }, [
    eventEmitter,
    isChromeVisible,
    services,
    state.savedVisInstance,
    state.visEditorController,
    visualizationIdFromUrl,
    valueInput,
  ]);

  useEffect(() => {
    return () => {
      if (state.visEditorController) {
        state.visEditorController.destroy();
      } else if (state.savedVisInstance?.embeddableHandler) {
        state.savedVisInstance.embeddableHandler.destroy();
      }
      if (state.savedVisInstance?.savedVis) {
        state.savedVisInstance.savedVis.destroy();
      }
    };
  }, [state]);

  return {
    ...state,
    visEditorRef,
  };
};

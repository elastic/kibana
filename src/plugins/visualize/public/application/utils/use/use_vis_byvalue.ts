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
import { ByValueVisInstance, VisualizeServices } from '../../types';
import type { IEditorController } from '../../../../../visualizations/public';
import { getVisualizationInstanceFromInput } from '../get_visualization_instance';
import { getEditBreadcrumbs } from '../breadcrumbs';
import { getDefaultEditor } from '../../../services';

export const useVisByValue = (
  services: VisualizeServices,
  eventEmitter: EventEmitter,
  isChromeVisible: boolean | undefined,
  valueInput?: VisualizeInput,
  originatingApp?: string
) => {
  const [state, setState] = useState<{
    byValueVisInstance?: ByValueVisInstance;
    visEditorController?: IEditorController;
  }>({});
  const visEditorRef = useRef<HTMLDivElement>(null);
  const loaded = useRef(false);
  useEffect(() => {
    const {
      chrome,
      application: { navigateToApp },
      stateTransferService,
    } = services;
    const getVisInstance = async () => {
      if (!valueInput || loaded.current || !visEditorRef.current) {
        return;
      }
      const byValueVisInstance = await getVisualizationInstanceFromInput(services, valueInput);
      const { embeddableHandler, vis } = byValueVisInstance;

      const Editor = vis.type.editor || getDefaultEditor();
      const visEditorController = new Editor(
        visEditorRef.current,
        vis,
        eventEmitter,
        embeddableHandler
      );

      const originatingAppName = originatingApp
        ? stateTransferService.getAppNameFromId(originatingApp)
        : undefined;
      const redirectToOrigin = originatingApp ? () => navigateToApp(originatingApp) : undefined;
      chrome?.setBreadcrumbs(
        getEditBreadcrumbs({ byValue: true, originatingAppName, redirectToOrigin })
      );

      loaded.current = true;
      setState({
        byValueVisInstance,
        visEditorController,
      });
    };

    getVisInstance();
  }, [
    eventEmitter,
    isChromeVisible,
    services,
    state.byValueVisInstance,
    state.visEditorController,
    valueInput,
    originatingApp,
  ]);

  useEffect(() => {
    return () => {
      if (state.visEditorController) {
        state.visEditorController.destroy();
      } else if (state.byValueVisInstance?.embeddableHandler) {
        state.byValueVisInstance.embeddableHandler.destroy();
      }
    };
  }, [state]);

  return {
    ...state,
    visEditorRef,
  };
};

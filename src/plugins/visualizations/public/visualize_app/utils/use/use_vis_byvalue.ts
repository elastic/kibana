/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EventEmitter } from 'events';
import { useEffect, useRef, useState } from 'react';
import { VisualizeInput } from '../../..';
import { ByValueVisInstance, VisualizeServices, IEditorController } from '../../types';
import { getVisualizationInstanceFromInput } from '../get_visualization_instance';
import { getEditBreadcrumbs, getEditServerlessBreadcrumbs } from '../breadcrumbs';

export const useVisByValue = (
  services: VisualizeServices,
  eventEmitter: EventEmitter,
  isChromeVisible: boolean | undefined,
  embeddableApiHandler: any,
  valueInput?: VisualizeInput,
  originatingApp?: string,
  originatingPath?: string
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
      visEditorsRegistry,
      serverless,
    } = services;
    const getVisInstance = async () => {
      if (!valueInput || loaded.current || !visEditorRef.current) {
        return;
      }
      const byValueVisInstance = await getVisualizationInstanceFromInput(services, valueInput);
      const { vis } = byValueVisInstance;
      let visEditorController;

      const Editor = visEditorsRegistry.get(vis.type.editorConfig?.editor);
      if (Editor) {
        visEditorController = new Editor(
          visEditorRef.current,
          vis,
          eventEmitter,
          embeddableApiHandler
        );
      }

      const originatingAppName = originatingApp
        ? stateTransferService.getAppNameFromId(originatingApp)
        : undefined;
      const redirectToOrigin = originatingApp
        ? () => navigateToApp(originatingApp, { path: originatingPath })
        : undefined;

      if (serverless?.setBreadcrumbs) {
        serverless.setBreadcrumbs(
          getEditServerlessBreadcrumbs({ byValue: true, originatingAppName, redirectToOrigin })
        );
      } else {
        chrome?.setBreadcrumbs(
          getEditBreadcrumbs({ byValue: true, originatingAppName, redirectToOrigin })
        );
      }

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
    originatingPath,
    embeddableApiHandler,
  ]);

  useEffect(() => {
    return () => {
      if (state.visEditorController) {
        state.visEditorController.destroy();
      }
    };
  }, [state]);

  return {
    ...state,
    visEditorRef,
  };
};

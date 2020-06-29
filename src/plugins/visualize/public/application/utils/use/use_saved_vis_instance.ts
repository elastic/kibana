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

import { useEffect, useRef, useState } from 'react';
import { EventEmitter } from 'events';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';

import { redirectWhenMissing } from '../../../../../kibana_utils/public';
import { DefaultEditorController } from '../../../../../vis_default_editor/public';

import { getVisualizationInstance } from '../get_visualization_instance';
import { getEditBreadcrumbs, getCreateBreadcrumbs } from '../breadcrumbs';
import { SavedVisInstance, IEditorController, VisualizeServices } from '../../types';
import { VisualizeConstants } from '../../visualize_constants';

/**
 * This effect is responsible for instantiating a saved vis or creating a new one
 * using url parameters, embedding and destroying it in DOM
 */
export const useSavedVisInstance = (
  services: VisualizeServices,
  eventEmitter: EventEmitter,
  isChromeVisible: boolean | undefined,
  visualizationIdFromUrl: string | undefined
) => {
  const [state, setState] = useState<{
    savedVisInstance?: SavedVisInstance;
    visEditorController?: IEditorController;
  }>({});
  const visEditorRef = useRef<HTMLDivElement>(null);
  const visId = useRef('');

  useEffect(() => {
    const {
      application: { navigateToApp },
      chrome,
      history,
      http: { basePath },
      setActiveUrl,
      toastNotifications,
    } = services;
    const getSavedVisInstance = async () => {
      try {
        let savedVisInstance: SavedVisInstance;

        if (history.location.pathname === '/create') {
          const searchParams = parse(history.location.search);
          const visTypes = services.visualizations.all();
          const visType = visTypes.find(({ name }) => name === searchParams.type);

          if (!visType) {
            throw new Error(
              i18n.translate('visualize.createVisualization.noVisTypeErrorMessage', {
                defaultMessage: 'You must provide a valid visualization type',
              })
            );
          }

          const shouldHaveIndex = visType.requiresSearch && visType.options.showIndexSelection;
          const hasIndex = searchParams.indexPattern || searchParams.savedSearchId;

          if (shouldHaveIndex && !hasIndex) {
            throw new Error(
              i18n.translate(
                'visualize.createVisualization.noIndexPatternOrSavedSearchIdErrorMessage',
                {
                  defaultMessage: 'You must provide either an indexPattern or a savedSearchId',
                }
              )
            );
          }

          savedVisInstance = await getVisualizationInstance(services, searchParams);
        } else {
          savedVisInstance = await getVisualizationInstance(services, visualizationIdFromUrl);
        }

        const { embeddableHandler, savedVis, vis } = savedVisInstance;

        if (savedVis.id) {
          chrome.setBreadcrumbs(getEditBreadcrumbs(savedVis.title));
          chrome.docTitle.change(savedVis.title);
        } else {
          chrome.setBreadcrumbs(getCreateBreadcrumbs());
        }

        let visEditorController;
        // do not create editor in embeded mode
        if (isChromeVisible) {
          const Editor = vis.type.editor || DefaultEditorController;
          visEditorController = new Editor(
            visEditorRef.current,
            vis,
            eventEmitter,
            embeddableHandler
          );
        } else if (visEditorRef.current) {
          embeddableHandler.render(visEditorRef.current);
        }

        setState({
          savedVisInstance,
          visEditorController,
        });
      } catch (error) {
        const managementRedirectTarget = {
          app: 'management',
          path: `kibana/objects/savedVisualizations/${visualizationIdFromUrl}`,
        };

        try {
          redirectWhenMissing({
            history,
            navigateToApp,
            toastNotifications,
            basePath,
            mapping: {
              visualization: VisualizeConstants.LANDING_PAGE_PATH,
              search: managementRedirectTarget,
              'index-pattern': managementRedirectTarget,
              'index-pattern-field': managementRedirectTarget,
            },
            onBeforeRedirect() {
              setActiveUrl(VisualizeConstants.LANDING_PAGE_PATH);
            },
          })(error);
        } catch (e) {
          toastNotifications.addWarning({
            title: i18n.translate('visualize.createVisualization.failedToLoadErrorMessage', {
              defaultMessage: 'Failed to load the visualization',
            }),
            text: e.message,
          });
          history.replace(VisualizeConstants.LANDING_PAGE_PATH);
        }
      }
    };

    if (isChromeVisible === undefined) {
      // wait for specifying chrome
      return;
    }

    if (!visId.current) {
      visId.current = visualizationIdFromUrl || 'new';
      getSavedVisInstance();
    } else if (
      visualizationIdFromUrl &&
      visId.current !== visualizationIdFromUrl &&
      state.savedVisInstance?.savedVis.id !== visualizationIdFromUrl
    ) {
      visId.current = visualizationIdFromUrl;
      setState({});
      getSavedVisInstance();
    }
  }, [
    eventEmitter,
    isChromeVisible,
    services,
    state.savedVisInstance,
    state.visEditorController,
    visualizationIdFromUrl,
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

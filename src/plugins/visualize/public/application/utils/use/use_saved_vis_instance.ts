/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect, useRef, useState } from 'react';
import { EventEmitter } from 'events';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';

import { getVisualizationInstance } from '../get_visualization_instance';
import { getEditBreadcrumbs, getCreateBreadcrumbs } from '../breadcrumbs';
import { SavedVisInstance, VisualizeServices, IEditorController } from '../../types';
import { VisualizeConstants } from '../../visualize_constants';
import { getVisEditorsRegistry } from '../../../services';
import { redirectToSavedObjectPage } from '../utils';

/**
 * This effect is responsible for instantiating a saved vis or creating a new one
 * using url parameters, embedding and destroying it in DOM
 */
export const useSavedVisInstance = (
  services: VisualizeServices,
  eventEmitter: EventEmitter,
  isChromeVisible: boolean | undefined,
  originatingApp: string | undefined,
  visualizationIdFromUrl: string | undefined
) => {
  const [state, setState] = useState<{
    savedVisInstance?: SavedVisInstance;
    visEditorController?: IEditorController;
  }>({});

  const visEditorRef = useRef<HTMLDivElement | null>(null);
  const visId = useRef('');

  useEffect(() => {
    const {
      chrome,
      history,
      dashboard,
      toastNotifications,
      stateTransferService,
      application: { navigateToApp },
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

        const originatingAppName = originatingApp
          ? stateTransferService.getAppNameFromId(originatingApp)
          : undefined;
        const redirectToOrigin = originatingApp ? () => navigateToApp(originatingApp) : undefined;
        const byValueCreateMode =
          Boolean(originatingApp) && dashboard.dashboardFeatureFlagConfig.allowByValueEmbeddables;

        if (savedVis.id) {
          chrome.setBreadcrumbs(
            getEditBreadcrumbs({ originatingAppName, redirectToOrigin }, savedVis.title)
          );
          chrome.docTitle.change(savedVis.title);
        } else {
          chrome.setBreadcrumbs(
            getCreateBreadcrumbs({
              byValue: byValueCreateMode,
              originatingAppName,
              redirectToOrigin,
            })
          );
        }

        let visEditorController;
        // do not create editor in embeded mode
        if (visEditorRef.current) {
          if (isChromeVisible) {
            const Editor = getVisEditorsRegistry().get(vis.type.editorConfig?.editor);

            if (Editor) {
              visEditorController = new Editor(
                visEditorRef.current,
                vis,
                eventEmitter,
                embeddableHandler
              );
            }
          } else {
            embeddableHandler.render(visEditorRef.current);
          }
        }
        setState({
          savedVisInstance,
          visEditorController,
        });
      } catch (error) {
        try {
          redirectToSavedObjectPage(services, error, visualizationIdFromUrl);
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
    services,
    eventEmitter,
    originatingApp,
    isChromeVisible,
    visualizationIdFromUrl,
    state.savedVisInstance,
    state.visEditorController,
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

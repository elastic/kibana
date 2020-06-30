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
import { i18n } from '@kbn/i18n';

import { TopNavMenuData } from 'src/plugins/navigation/public';
import uuid from 'uuid';
import { VISUALIZE_EMBEDDABLE_TYPE } from '../../../../visualizations/public';
import {
  showSaveModal,
  SavedObjectSaveModalOrigin,
  SavedObjectSaveOpts,
  OnSaveProps,
} from '../../../../saved_objects/public';
import { unhashUrl } from '../../../../kibana_utils/public';

import { SavedVisInstance, VisualizeServices, VisualizeAppStateContainer } from '../types';
import { VisualizeConstants } from '../visualize_constants';
import { getEditBreadcrumbs } from './breadcrumbs';
interface TopNavConfigParams {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  openInspector: () => void;
  originatingApp?: string;
  hasUnappliedChanges: boolean;
  savedVisInstance: SavedVisInstance;
  stateContainer: VisualizeAppStateContainer;
  visualizationIdFromUrl?: string;
}

export const getTopNavConfig = (
  {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    openInspector,
    originatingApp,
    hasUnappliedChanges,
    savedVisInstance: { embeddableHandler, savedVis, vis },
    stateContainer,
    visualizationIdFromUrl,
  }: TopNavConfigParams,
  {
    application,
    chrome,
    embeddable,
    history,
    share,
    setActiveUrl,
    toastNotifications,
    visualizeCapabilities,
    i18n: { Context: I18nContext },
    featureFlagConfig,
  }: VisualizeServices
) => {
  /**
   * Called when the user clicks "Save" button.
   */
  async function doSave(saveOptions: SavedObjectSaveOpts) {
    const newlyCreated = !Boolean(savedVis.id) || savedVis.copyOnSave;
    // vis.title was not bound and it's needed to reflect title into visState
    stateContainer.transitions.setVis({
      title: savedVis.title,
    });
    savedVis.searchSourceFields = vis.data.searchSource?.getSerializedFields();
    savedVis.visState = stateContainer.getState().vis;
    savedVis.uiStateJSON = vis.uiState.toString();
    setHasUnsavedChanges(false);

    try {
      const id = await savedVis.save(saveOptions);

      if (id) {
        toastNotifications.addSuccess({
          title: i18n.translate('visualize.topNavMenu.saveVisualization.successNotificationText', {
            defaultMessage: `Saved '{visTitle}'`,
            values: {
              visTitle: savedVis.title,
            },
          }),
          'data-test-subj': 'saveVisualizationSuccess',
        });

        if (originatingApp && saveOptions.returnToOrigin) {
          const appPath = `${VisualizeConstants.EDIT_PATH}/${encodeURIComponent(id)}`;

          // Manually insert a new url so the back button will open the saved visualization.
          history.replace(appPath);
          setActiveUrl(appPath);

          if (newlyCreated && embeddable) {
            embeddable.getStateTransfer().navigateToWithEmbeddablePackage(originatingApp, {
              state: { id, type: VISUALIZE_EMBEDDABLE_TYPE },
            });
          } else {
            application.navigateToApp(originatingApp);
          }
        } else {
          chrome.docTitle.change(savedVis.lastSavedTitle);
          chrome.setBreadcrumbs(getEditBreadcrumbs(savedVis.lastSavedTitle));

          if (id !== visualizationIdFromUrl) {
            history.replace({
              ...history.location,
              pathname: `${VisualizeConstants.EDIT_PATH}/${id}`,
            });
          }
        }
      }

      return { id };
    } catch (error) {
      // eslint-disable-next-line
      console.error(error);
      toastNotifications.addDanger({
        title: i18n.translate('visualize.topNavMenu.saveVisualization.failureNotificationText', {
          defaultMessage: `Error on saving '{visTitle}'`,
          values: {
            visTitle: savedVis.title,
          },
        }),
        text: error.message,
        'data-test-subj': 'saveVisualizationError',
      });
      return { error };
    }
  }

  const topNavMenu: TopNavMenuData[] = [
    ...(originatingApp && savedVis.id
      ? [
          {
            id: 'saveAndReturn',
            label: i18n.translate('visualize.topNavMenu.saveAndReturnVisualizationButtonLabel', {
              defaultMessage: 'Save and return',
            }),
            emphasize: true,
            iconType: 'check',
            description: i18n.translate(
              'visualize.topNavMenu.saveAndReturnVisualizationButtonAriaLabel',
              {
                defaultMessage: 'Finish editing visualization and return to the last app',
              }
            ),
            testId: 'visualizesaveAndReturnButton',
            disableButton: hasUnappliedChanges,
            tooltip() {
              if (hasUnappliedChanges) {
                return i18n.translate(
                  'visualize.topNavMenu.saveAndReturnVisualizationDisabledButtonTooltip',
                  {
                    defaultMessage: 'Apply or Discard your changes before finishing',
                  }
                );
              }
            },
            run: async () => {
              const saveOptions = {
                confirmOverwrite: false,
                returnToOrigin: true,
              };
              return doSave(saveOptions);
            },
          },
        ]
      : []),
    ...(visualizeCapabilities.save
      ? [
          {
            id: 'save',
            label:
              savedVis.id && originatingApp
                ? i18n.translate('visualize.topNavMenu.saveVisualizationAsButtonLabel', {
                    defaultMessage: 'save as',
                  })
                : i18n.translate('visualize.topNavMenu.saveVisualizationButtonLabel', {
                    defaultMessage: 'save',
                  }),
            emphasize: !savedVis.id || !originatingApp,
            description: i18n.translate('visualize.topNavMenu.saveVisualizationButtonAriaLabel', {
              defaultMessage: 'Save Visualization',
            }),
            testId: 'visualizeSaveButton',
            disableButton: hasUnappliedChanges,
            tooltip() {
              if (hasUnappliedChanges) {
                return i18n.translate(
                  'visualize.topNavMenu.saveVisualizationDisabledButtonTooltip',
                  {
                    defaultMessage: 'Apply or Discard your changes before saving',
                  }
                );
              }
            },
            run: () => {
              const onSave = async ({
                newTitle,
                newCopyOnSave,
                isTitleDuplicateConfirmed,
                onTitleDuplicate,
                newDescription,
                returnToOrigin,
              }: OnSaveProps & { returnToOrigin: boolean }) => {
                const currentTitle = savedVis.title;
                savedVis.title = newTitle;
                savedVis.copyOnSave = newCopyOnSave;
                savedVis.description = newDescription;
                const saveOptions = {
                  confirmOverwrite: false,
                  isTitleDuplicateConfirmed,
                  onTitleDuplicate,
                  returnToOrigin,
                };
                const response = await doSave(saveOptions);
                // If the save wasn't successful, put the original values back.
                if (!response.id || response.error) {
                  savedVis.title = currentTitle;
                }
                return response;
              };

              const createVisReference = () => {
                if (!originatingApp) {
                  return;
                }
                const input = {
                  ...vis.serialize(),
                  id: uuid.v4(),
                };
                embeddable.getStateTransfer().navigateToWithEmbeddablePackage(originatingApp, {
                  state: { input, type: VISUALIZE_EMBEDDABLE_TYPE },
                });
              };

              const saveModal = (
                <SavedObjectSaveModalOrigin
                  documentInfo={savedVis}
                  onSave={onSave}
                  objectType={'visualization'}
                  onClose={() => {}}
                  originatingApp={originatingApp}
                />
              );
              if (originatingApp === 'dashboards' && featureFlagConfig.showNewVisualizeFlow) {
                createVisReference();
              } else {
                showSaveModal(saveModal, I18nContext);
              }
            },
          },
        ]
      : []),
    {
      id: 'share',
      label: i18n.translate('visualize.topNavMenu.shareVisualizationButtonLabel', {
        defaultMessage: 'share',
      }),
      description: i18n.translate('visualize.topNavMenu.shareVisualizationButtonAriaLabel', {
        defaultMessage: 'Share Visualization',
      }),
      testId: 'shareTopNavButton',
      run: (anchorElement) => {
        if (share) {
          share.toggleShareContextMenu({
            anchorElement,
            allowEmbed: true,
            allowShortUrl: visualizeCapabilities.createShortUrl,
            shareableUrl: unhashUrl(window.location.href),
            objectId: savedVis.id,
            objectType: 'visualization',
            sharingData: {
              title: savedVis.title,
            },
            isDirty: hasUnappliedChanges || hasUnsavedChanges,
          });
        }
      },
      // disable the Share button if no action specified
      disableButton: !share,
    },
    {
      id: 'inspector',
      label: i18n.translate('visualize.topNavMenu.openInspectorButtonLabel', {
        defaultMessage: 'inspect',
      }),
      description: i18n.translate('visualize.topNavMenu.openInspectorButtonAriaLabel', {
        defaultMessage: 'Open Inspector for visualization',
      }),
      testId: 'openInspectorButton',
      disableButton() {
        return !embeddableHandler.hasInspector || !embeddableHandler.hasInspector();
      },
      run: openInspector,
      tooltip() {
        if (!embeddableHandler.hasInspector || !embeddableHandler.hasInspector()) {
          return i18n.translate('visualize.topNavMenu.openInspectorDisabledButtonTooltip', {
            defaultMessage: `This visualization doesn't support any inspectors.`,
          });
        }
      },
    },
  ];

  return topNavMenu;
};

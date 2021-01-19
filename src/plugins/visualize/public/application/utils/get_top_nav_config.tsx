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
import { VISUALIZE_EMBEDDABLE_TYPE, VisualizeInput } from '../../../../visualizations/public';
import {
  showSaveModal,
  SavedObjectSaveModalOrigin,
  SavedObjectSaveOpts,
  OnSaveProps,
} from '../../../../saved_objects/public';
import { SavedObjectSaveModalDashboard } from '../../../../presentation_util/public';
import { unhashUrl } from '../../../../kibana_utils/public';
import { SavedObjectsClientContract } from '../../../../../core/public';

import {
  VisualizeServices,
  VisualizeAppStateContainer,
  VisualizeEditorVisInstance,
} from '../types';
import { VisualizeConstants } from '../visualize_constants';
import { getEditBreadcrumbs } from './breadcrumbs';
import { EmbeddableStateTransfer } from '../../../../embeddable/public';

interface TopNavConfigParams {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  openInspector: () => void;
  originatingApp?: string;
  setOriginatingApp?: (originatingApp: string | undefined) => void;
  hasUnappliedChanges: boolean;
  visInstance: VisualizeEditorVisInstance;
  stateContainer: VisualizeAppStateContainer;
  visualizationIdFromUrl?: string;
  stateTransfer: EmbeddableStateTransfer;
  savedObjectsClient: SavedObjectsClientContract;
  embeddableId?: string;
}

export const getTopNavConfig = (
  {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    openInspector,
    originatingApp,
    setOriginatingApp,
    hasUnappliedChanges,
    visInstance,
    stateContainer,
    savedObjectsClient,
    visualizationIdFromUrl,
    stateTransfer,
    embeddableId,
  }: TopNavConfigParams,
  {
    application,
    chrome,
    history,
    share,
    setActiveUrl,
    toastNotifications,
    visualizeCapabilities,
    i18n: { Context: I18nContext },
    dashboard,
    savedObjectsTagging,
  }: VisualizeServices
) => {
  const { vis, embeddableHandler } = visInstance;
  const savedVis = visInstance.savedVis;
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
          if (!embeddableId) {
            const appPath = `${VisualizeConstants.EDIT_PATH}/${encodeURIComponent(id)}`;

            // Manually insert a new url so the back button will open the saved visualization.
            history.replace(appPath);
            setActiveUrl(appPath);
          }

          if (newlyCreated && stateTransfer) {
            stateTransfer.navigateToWithEmbeddablePackage(originatingApp, {
              state: {
                type: VISUALIZE_EMBEDDABLE_TYPE,
                input: { savedObjectId: id },
                embeddableId,
              },
            });
          } else {
            application.navigateToApp(originatingApp);
          }
        } else {
          if (setOriginatingApp && originatingApp && newlyCreated) {
            setOriginatingApp(undefined);
            // remove editor state so the connection is still broken after reload
            stateTransfer.clearEditorState();
          }
          chrome.docTitle.change(savedVis.lastSavedTitle);
          chrome.setBreadcrumbs(getEditBreadcrumbs({}, savedVis.lastSavedTitle));

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

  const createVisReference = () => {
    if (!originatingApp) {
      return;
    }

    const state = {
      input: {
        savedVis: vis.serialize(),
      } as VisualizeInput,
      embeddableId,
      type: VISUALIZE_EMBEDDABLE_TYPE,
    };
    stateTransfer.navigateToWithEmbeddablePackage(originatingApp, { state });
  };

  const navigateToOriginatingApp = () => {
    if (originatingApp) {
      application.navigateToApp(originatingApp);
    }
  };

  const saveButtonLabel =
    embeddableId ||
    (!savedVis.id && dashboard.dashboardFeatureFlagConfig.allowByValueEmbeddables && originatingApp)
      ? i18n.translate('visualize.topNavMenu.saveVisualizationToLibraryButtonLabel', {
          defaultMessage: 'Save to library',
        })
      : originatingApp && (embeddableId || savedVis.id)
      ? i18n.translate('visualize.topNavMenu.saveVisualizationAsButtonLabel', {
          defaultMessage: 'Save as',
        })
      : i18n.translate('visualize.topNavMenu.saveVisualizationButtonLabel', {
          defaultMessage: 'Save',
        });

  const showSaveAndReturn =
    originatingApp &&
    (savedVis?.id || dashboard.dashboardFeatureFlagConfig.allowByValueEmbeddables);

  const topNavMenu: TopNavMenuData[] = [
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
        if (share && !embeddableId) {
          // TODO: support sharing in by-value mode
          share.toggleShareContextMenu({
            anchorElement,
            allowEmbed: true,
            allowShortUrl: visualizeCapabilities.createShortUrl,
            shareableUrl: unhashUrl(window.location.href),
            objectId: savedVis?.id,
            objectType: 'visualization',
            sharingData: {
              title: savedVis?.title,
            },
            isDirty: hasUnappliedChanges || hasUnsavedChanges,
          });
        }
      },
      // disable the Share button if no action specified
      disableButton: !share || !!embeddableId,
    },
    ...(originatingApp
      ? [
          {
            id: 'cancel',
            label: i18n.translate('visualize.topNavMenu.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            }),
            emphasize: false,
            description: i18n.translate('visualize.topNavMenu.cancelButtonAriaLabel', {
              defaultMessage: 'Return to the last app without saving changes',
            }),
            testId: 'visualizeCancelAndReturnButton',
            tooltip() {
              if (hasUnappliedChanges || hasUnsavedChanges) {
                return i18n.translate('visualize.topNavMenu.cancelAndReturnButtonTooltip', {
                  defaultMessage: 'Discard your changes before finishing',
                });
              }
            },
            run: async () => {
              return navigateToOriginatingApp();
            },
          },
        ]
      : []),
    ...(visualizeCapabilities.save
      ? [
          {
            id: 'save',
            iconType: showSaveAndReturn ? undefined : 'save',
            label: saveButtonLabel,
            emphasize: !showSaveAndReturn,
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
                dashboardId,
              }: OnSaveProps & { returnToOrigin?: boolean } & { dashboardId?: string | null }) => {
                const currentTitle = savedVis.title;
                savedVis.title = newTitle;
                embeddableHandler.updateInput({ title: newTitle });
                savedVis.copyOnSave = newCopyOnSave;
                savedVis.description = newDescription;

                if (savedObjectsTagging && savedObjectsTagging.ui.hasTagDecoration(savedVis)) {
                  savedVis.setTags(selectedTags);
                }

                const saveOptions = {
                  confirmOverwrite: false,
                  isTitleDuplicateConfirmed,
                  onTitleDuplicate,
                  returnToOrigin,
                };

                if (dashboardId) {
                  const appPath = `${VisualizeConstants.LANDING_PAGE_PATH}`;

                  // Manually insert a new url so the back button will open the saved visualization.
                  history.replace(appPath);
                  setActiveUrl(appPath);

                  const state = {
                    input: {
                      savedVis: {
                        ...vis.serialize(),
                        title: newTitle,
                        description: newDescription,
                      },
                    } as VisualizeInput,
                    embeddableId,
                    type: VISUALIZE_EMBEDDABLE_TYPE,
                  };

                  const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

                  stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
                    state,
                    path,
                  });

                  // TODO: Saved Object Modal requires `id` to be defined so this is a workaround
                  return { id: true };
                }

                const response = await doSave(saveOptions);
                // If the save wasn't successful, put the original values back.
                if (!response.id || response.error) {
                  savedVis.title = currentTitle;
                }

                return response;
              };

              let selectedTags: string[] = [];
              let tagOptions: React.ReactNode | undefined;

              if (savedObjectsTagging) {
                if (savedVis && savedObjectsTagging.ui.hasTagDecoration(savedVis)) {
                  selectedTags = savedVis.getTags();
                }
                tagOptions = (
                  <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
                    initialSelection={selectedTags}
                    onTagsSelected={(newSelection) => {
                      selectedTags = newSelection;
                    }}
                  />
                );
              }

              const saveModal =
                !!originatingApp ||
                !dashboard.dashboardFeatureFlagConfig.allowByValueEmbeddables ? (
                  <SavedObjectSaveModalOrigin
                    documentInfo={savedVis || { title: '' }}
                    onSave={onSave}
                    options={tagOptions}
                    getAppNameFromId={stateTransfer.getAppNameFromId}
                    objectType={'visualization'}
                    onClose={() => {}}
                    originatingApp={originatingApp}
                    returnToOriginSwitchLabel={
                      originatingApp && embeddableId
                        ? i18n.translate('visualize.topNavMenu.updatePanel', {
                            defaultMessage: 'Update panel on {originatingAppName}',
                            values: {
                              originatingAppName: stateTransfer.getAppNameFromId(originatingApp),
                            },
                          })
                        : undefined
                    }
                  />
                ) : (
                  <SavedObjectSaveModalDashboard
                    documentInfo={savedVis || { title: '' }}
                    onSave={onSave}
                    tagOptions={tagOptions}
                    objectType={'visualization'}
                    onClose={() => {}}
                    savedObjectsClient={savedObjectsClient}
                  />
                );
              showSaveModal(saveModal, I18nContext);
            },
          },
        ]
      : []),
    ...(visualizeCapabilities.save && showSaveAndReturn
      ? [
          {
            id: 'saveAndReturn',
            label: i18n.translate('visualize.topNavMenu.saveAndReturnVisualizationButtonLabel', {
              defaultMessage: 'Save and return',
            }),
            emphasize: true,
            iconType: 'checkInCircleFilled',
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
              if (!savedVis?.id) {
                return createVisReference();
              }
              const saveOptions = {
                confirmOverwrite: false,
                returnToOrigin: true,
              };
              return doSave(saveOptions);
            },
          },
        ]
      : []),
  ];

  return topNavMenu;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import moment from 'moment';
import type EventEmitter from 'events';
import { i18n } from '@kbn/i18n';
import type { EuiBetaBadgeProps } from '@elastic/eui';
import { parse } from 'query-string';

import type { Capabilities } from '@kbn/core/public';
import type { TopNavMenuData } from '@kbn/navigation-plugin/public';
import type {
  SavedObjectSaveOpts,
  OnSaveProps,
  ShowSaveModalMinimalSaveModalProps,
  SaveResult,
} from '@kbn/saved-objects-plugin/public';
import { showSaveModal, SavedObjectSaveModalOrigin } from '@kbn/saved-objects-plugin/public';
import {
  LazySavedObjectSaveModalDashboardWithSaveResult,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import { unhashUrl } from '@kbn/kibana-utils-plugin/public';
import type { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import { VISUALIZE_APP_LOCATOR } from '@kbn/deeplinks-analytics';

import { VisualizeConstants, VISUALIZE_EMBEDDABLE_TYPE } from '@kbn/visualizations-common';
import {
  AGG_BASED_VISUALIZATION_TRIGGER,
  VISUALIZE_EDITOR_TRIGGER,
} from '@kbn/ui-actions-plugin/common/trigger_ids';
import { saveVisualization } from '../../utils/saved_visualize_utils';
import { getFullPath } from '../..';

import type {
  VisualizeServices,
  VisualizeAppStateContainer,
  VisualizeEditorVisInstance,
} from '../types';
import { getEditBreadcrumbs, getEditServerlessBreadcrumbs } from './breadcrumbs';
import type { VisualizeLocatorParams } from '../../../common/locator';
import { getUiActions } from '../../services';
import { getVizEditorOriginatingAppUrl } from './utils';

import { serializeState } from '../../embeddable/state';

interface VisualizeCapabilities {
  createShortUrl: boolean;
  delete: boolean;
  save: boolean;
  show: boolean;
}

export interface TopNavConfigParams {
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  openInspector: () => void;
  originatingApp?: string;
  originatingPath?: string;
  setOriginatingApp?: (originatingApp: string | undefined) => void;
  hasUnappliedChanges: boolean;
  visInstance: VisualizeEditorVisInstance;
  stateContainer: VisualizeAppStateContainer;
  visualizationIdFromUrl?: string;
  stateTransfer: EmbeddableStateTransfer;
  embeddableId?: string;
  displayEditInLensItem: boolean;
  hideLensBadge: () => void;
  setNavigateToLens: (flag: boolean) => void;
  showBadge: boolean;
  eventEmitter?: EventEmitter;
}

const SavedObjectSaveModalDashboardWithSaveResult = withSuspense(
  LazySavedObjectSaveModalDashboardWithSaveResult
);

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.visualize_v2) return false;

  const visualize = anonymousUserCapabilities.visualize_v2 as unknown as VisualizeCapabilities;

  return !!visualize.show;
};

export const getTopNavConfig = (
  {
    hasUnsavedChanges,
    setHasUnsavedChanges,
    openInspector,
    originatingApp,
    originatingPath,
    setOriginatingApp,
    hasUnappliedChanges,
    visInstance,
    stateContainer,
    visualizationIdFromUrl,
    stateTransfer,
    embeddableId,
    displayEditInLensItem,
    hideLensBadge,
    setNavigateToLens,
    showBadge,
    eventEmitter,
  }: TopNavConfigParams,
  {
    data,
    application,
    chrome,
    history,
    share,
    setActiveUrl,
    toastNotifications,
    visualizeCapabilities,
    dashboardCapabilities,
    savedObjectsTagging,
    presentationUtil,
    getKibanaVersion,
    serverless,
    ...startServices
  }: VisualizeServices
) => {
  const { vis, embeddableHandler } = visInstance;
  const savedVis = visInstance.savedVis;
  const isOriginatingFromDashboardPanel = Boolean(
    originatingApp &&
      !(originatingApp === 'dashboards' && Boolean(originatingPath?.includes('/list/')))
  );

  /**
   * Called when the user clicks "Save" button.
   */
  async function doSave(
    saveOptions: SavedObjectSaveOpts & { dashboardId?: string; copyOnSave?: boolean }
  ) {
    const newlyCreated = !Boolean(savedVis.id) || saveOptions.copyOnSave;
    // vis.title was not bound and it's needed to reflect title into visState
    stateContainer.transitions.setVis({
      title: savedVis.title,
    });

    savedVis.savedSearchId = vis.data.savedSearchId;
    savedVis.searchSourceFields = vis.data.searchSource?.getSerializedFields();
    savedVis.visState = stateContainer.getState().vis;
    savedVis.uiStateJSON = vis.uiState.toString();

    setHasUnsavedChanges(false);

    try {
      const id = await saveVisualization(savedVis, saveOptions, {
        savedObjectsTagging,
        ...startServices,
      });

      if (id) {
        toastNotifications.addSuccess({
          title: i18n.translate(
            'visualizations.topNavMenu.saveVisualization.successNotificationText',
            {
              defaultMessage: `Saved ''{visTitle}''`,
              values: {
                visTitle: savedVis.title,
              },
            }
          ),
          'data-test-subj': 'saveVisualizationSuccess',
        });

        chrome.recentlyAccessed.add(getFullPath(id), savedVis.title, String(id));

        if (
          (isOriginatingFromDashboardPanel && saveOptions.returnToOrigin) ||
          saveOptions.dashboardId
        ) {
          if (!embeddableId) {
            const appPath = `${VisualizeConstants.EDIT_PATH}/${encodeURIComponent(id)}`;

            // Manually insert a new url so the back button will open the saved visualization.
            history.replace(appPath);
            setActiveUrl(appPath);
          }

          const app = isOriginatingFromDashboardPanel ? originatingApp! : 'dashboards';

          let path;
          if (saveOptions.dashboardId) {
            path =
              saveOptions.dashboardId === 'new' ? '#/create' : `#/view/${saveOptions.dashboardId}`;
          } else if (originatingPath) {
            path = originatingPath;
          }

          if (stateTransfer) {
            stateTransfer.navigateToWithEmbeddablePackages(app, {
              state: [
                {
                  type: VISUALIZE_EMBEDDABLE_TYPE,
                  serializedState: {
                    savedObjectId: id,
                  },
                  embeddableId: saveOptions.copyOnSave ? undefined : embeddableId,
                  searchSessionId: data.search.session.getSessionId(),
                },
              ],
              path,
            });
          } else {
            application.navigateToApp(app, { path });
          }
        } else {
          if (setOriginatingApp && originatingApp && newlyCreated) {
            setOriginatingApp(undefined);
            // remove editor state so the connection is still broken after reload
            stateTransfer.clearEditorState(VisualizeConstants.APP_ID);
          }
          chrome.docTitle.change(savedVis.lastSavedTitle);
          if (serverless?.setBreadcrumbs) {
            serverless.setBreadcrumbs(getEditServerlessBreadcrumbs({}, savedVis.lastSavedTitle));
          } else {
            const originatingAppName = originatingApp
              ? stateTransfer.getAppNameFromId(originatingApp)
              : undefined;
            chrome.setBreadcrumbs(
              getEditBreadcrumbs(
                {
                  ...(originatingAppName && {
                    originatingAppName,
                    redirectToOrigin: navigateToOriginatingApp,
                  }),
                },
                savedVis.lastSavedTitle
              )
            );
          }

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
      // eslint-disable-next-line no-console
      console.error(error);
      toastNotifications.addDanger({
        title: i18n.translate(
          'visualizations.topNavMenu.saveVisualization.failureNotificationText',
          {
            defaultMessage: `Error on saving ''{visTitle}''`,
            values: {
              visTitle: savedVis.title,
            },
          }
        ),
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

    stateTransfer.navigateToWithEmbeddablePackages(originatingApp, {
      state: [
        {
          serializedState: serializeState({
            serializedVis: vis.serialize(),
          }),
          embeddableId,
          type: VISUALIZE_EMBEDDABLE_TYPE,
          searchSessionId: data.search.session.getSessionId(),
        },
      ],
      path: originatingPath,
    });
  };

  const navigateToOriginatingApp = () => {
    if (originatingApp) {
      application.navigateToApp(originatingApp, { path: originatingPath });
    }
  };

  const saveButtonLabel =
    !savedVis.id && isOriginatingFromDashboardPanel
      ? i18n.translate('visualizations.topNavMenu.saveVisualizationToLibraryButtonLabel', {
          defaultMessage: 'Save to library',
        })
      : isOriginatingFromDashboardPanel && savedVis.id
      ? i18n.translate('visualizations.topNavMenu.saveVisualizationAsButtonLabel', {
          defaultMessage: 'Save as',
        })
      : i18n.translate('visualizations.topNavMenu.saveVisualizationButtonLabel', {
          defaultMessage: 'Save',
        });

  const showSaveButton =
    visualizeCapabilities.save ||
    (!isOriginatingFromDashboardPanel && dashboardCapabilities.showWriteControls);

  const showShareOptions = async (anchorElement: HTMLElement, asExport?: boolean) => {
    if (share) {
      const currentState = stateContainer.getState();
      const searchParams = parse(history.location.search);
      const params: VisualizeLocatorParams = {
        visId: savedVis?.id,
        filters: currentState.filters,
        refreshInterval: undefined,
        timeRange: data.query.timefilter.timefilter.getTime(),
        uiState: currentState.uiState,
        query: currentState.query,
        vis: currentState.vis,
        linked: currentState.linked,
        indexPattern:
          visInstance.savedSearch?.searchSource?.getField('index')?.id ??
          (searchParams.indexPattern as string),
        savedSearchId: visInstance.savedSearch?.id ?? (searchParams.savedSearchId as string),
      };
      // TODO: support sharing in by-value mode
      await share.toggleShareContextMenu({
        asExport,
        anchorElement,
        allowShortUrl: Boolean(visualizeCapabilities.createShortUrl),
        shareableUrl: unhashUrl(window.location.href),
        objectId: savedVis?.id,
        objectType: 'visualization',
        objectTypeMeta: {
          title: i18n.translate('visualizations.share.shareModal.title', {
            defaultMessage: 'Share this visualization',
          }),
          config: {
            embed: {
              computeAnonymousCapabilities: showPublicUrlSwitch,
            },
            integration: {
              export: {
                pdfReports: {
                  draftModeCallOut: true,
                },
                imageReports: {
                  draftModeCallOut: true,
                },
                csvReports: {
                  draftModeCallOut: true,
                },
              },
            },
          },
        },
        sharingData: {
          title:
            savedVis?.title ||
            i18n.translate('visualizations.reporting.defaultReportTitle', {
              defaultMessage: 'Visualization [{date}]',
              values: { date: moment().toISOString(true) },
            }),
          locatorParams: {
            id: VISUALIZE_APP_LOCATOR,
            version: getKibanaVersion(),
            params,
          },
        },
        isDirty: hasUnappliedChanges || hasUnsavedChanges,
      });
    }
  };

  const topNavMenu: TopNavMenuData[] = [
    ...(displayEditInLensItem
      ? [
          {
            id: 'goToLens',
            label: i18n.translate('visualizations.topNavMenu.goToLensButtonLabel', {
              defaultMessage: 'Edit visualization in Lens',
            }),
            emphasize: false,
            description: i18n.translate('visualizations.topNavMenu.goToLensButtonAriaLabel', {
              defaultMessage: 'Go to Lens with your current configuration',
            }),
            className: 'visNavItem__goToLens',
            testId: 'visualizeEditInLensButton',
            ...(showBadge && {
              badge: {
                label: i18n.translate('visualizations.tonNavMenu.tryItBadgeText', {
                  defaultMessage: 'Try it',
                }),
                color: 'accent' as EuiBetaBadgeProps['color'],
              },
            }),
            run: async () => {
              // lens doesn't support saved searches, should unlink before transition
              if (eventEmitter && visInstance.vis.data.savedSearchId) {
                eventEmitter.emit('unlinkFromSavedSearch', false);
              }
              const navigateToLensConfig = await visInstance.vis.type.navigateToLens?.(
                vis,
                data.query.timefilter.timefilter
              );
              const searchFilters = data.query.filterManager.getAppFilters();
              const searchQuery = data.query.queryString.getQuery();
              const updatedWithMeta = {
                ...navigateToLensConfig,
                embeddableId,
                vizEditorOriginatingAppUrl: getVizEditorOriginatingAppUrl(history),
                originatingApp,
                title: visInstance?.panelTitle || vis.title,
                visTypeTitle: vis.type.title,
                description: visInstance?.panelDescription || vis.description,
                panelTimeRange: visInstance?.panelTimeRange,
                isEmbeddable: Boolean(originatingApp),
                ...(searchFilters && { searchFilters }),
                ...(searchQuery && { searchQuery }),
              };
              if (navigateToLensConfig) {
                hideLensBadge();
                setNavigateToLens(true);
                getUiActions().executeTriggerActions(
                  visInstance.vis.type.group === 'aggbased'
                    ? AGG_BASED_VISUALIZATION_TRIGGER
                    : VISUALIZE_EDITOR_TRIGGER,
                  updatedWithMeta
                );
              }
            },
          },
        ]
      : []),
    {
      id: 'inspector',
      label: i18n.translate('visualizations.topNavMenu.openInspectorButtonLabel', {
        defaultMessage: 'inspect',
      }),
      description: i18n.translate('visualizations.topNavMenu.openInspectorButtonAriaLabel', {
        defaultMessage: 'Open Inspector for visualization',
      }),
      testId: 'openInspectorButton',
      disableButton() {
        return !embeddableHandler.hasInspector || !embeddableHandler.hasInspector();
      },
      run: openInspector,
      tooltip() {
        if (!embeddableHandler.hasInspector || !embeddableHandler.hasInspector()) {
          return i18n.translate('visualizations.topNavMenu.openInspectorDisabledButtonTooltip', {
            defaultMessage: `This visualization doesn't support any inspectors.`,
          });
        }
      },
    },
    // Only show the export button if the current user meets the requirements for at least one registered export integration
    ...(Boolean(share?.availableIntegrations('visualization', 'export')?.length)
      ? ([
          {
            id: 'export',
            iconType: 'download',
            iconOnly: true,
            label: i18n.translate('visualizations.topNavMenu.shareVisualizationButtonLabel', {
              defaultMessage: 'export',
            }),
            description: i18n.translate(
              'visualizations.topNavMenu.shareVisualizationButtonAriaLabel',
              {
                defaultMessage: 'Export Visualization',
              }
            ),
            testId: 'exportTopNavButton',
            run: (anchorElement) => showShareOptions(anchorElement, true),
            // disable the Share button if no action specified and fot byValue visualizations
            disableButton: !share || Boolean(!savedVis.id && originatingApp),
          },
        ] as TopNavMenuData[])
      : []),
    {
      id: 'share',
      iconType: 'share',
      iconOnly: true,
      label: i18n.translate('visualizations.topNavMenu.shareVisualizationButtonLabel', {
        defaultMessage: 'share',
      }),
      description: i18n.translate('visualizations.topNavMenu.shareVisualizationButtonAriaLabel', {
        defaultMessage: 'Share Visualization',
      }),
      testId: 'shareTopNavButton',
      run: showShareOptions,
      // disable the Share button if no action specified and fot byValue visualizations
      disableButton: !share || Boolean(!savedVis.id && originatingApp),
    },
    ...(isOriginatingFromDashboardPanel
      ? [
          {
            id: 'cancel',
            label: i18n.translate('visualizations.topNavMenu.cancelButtonLabel', {
              defaultMessage: 'Cancel',
            }),
            emphasize: false,
            description: i18n.translate('visualizations.topNavMenu.cancelButtonAriaLabel', {
              defaultMessage: 'Return to the last app without saving changes',
            }),
            testId: 'visualizeCancelAndReturnButton',
            tooltip() {
              if (hasUnappliedChanges || hasUnsavedChanges) {
                return i18n.translate('visualizations.topNavMenu.cancelAndReturnButtonTooltip', {
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
    ...(showSaveButton
      ? [
          {
            id: 'save',
            iconType: isOriginatingFromDashboardPanel ? undefined : 'save',
            label: saveButtonLabel,
            emphasize: !isOriginatingFromDashboardPanel,
            description: i18n.translate(
              'visualizations.topNavMenu.saveVisualizationButtonAriaLabel',
              {
                defaultMessage: 'Save Visualization',
              }
            ),
            testId: 'visualizeSaveButton',
            disableButton: hasUnappliedChanges,
            tooltip() {
              if (hasUnappliedChanges) {
                return i18n.translate(
                  'visualizations.topNavMenu.saveVisualizationDisabledButtonTooltip',
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
                addToLibrary,
              }: OnSaveProps & { returnToOrigin?: boolean } & {
                dashboardId?: string | null;
                addToLibrary?: boolean;
              }): Promise<SaveResult> => {
                const resolvedReturnToOrigin =
                  typeof returnToOrigin === 'boolean'
                    ? returnToOrigin
                    : isOriginatingFromDashboardPanel;
                const currentTitle = savedVis.title;
                savedVis.title = newTitle;
                embeddableHandler.updateInput({ title: newTitle });
                savedVis.description = newDescription;

                if (savedObjectsTagging) {
                  savedVis.tags = selectedTags;
                }

                // If we're adding to a dashboard and not saving to library,
                // we'll want to use a by-value operation
                if (dashboardId && !addToLibrary) {
                  const appPath = `${VisualizeConstants.LANDING_PAGE_PATH}`;

                  // Manually insert a new url so the back button will open the saved visualization.
                  history.replace(appPath);
                  setActiveUrl(appPath);

                  stateTransfer.navigateToWithEmbeddablePackages('dashboards', {
                    state: [
                      {
                        serializedState: serializeState({
                          serializedVis: vis.serialize(),
                          titles: {
                            title: newTitle,
                            description: newDescription,
                          },
                        }),
                        embeddableId,
                        type: VISUALIZE_EMBEDDABLE_TYPE,
                        searchSessionId: data.search.session.getSessionId(),
                      },
                    ],
                    path: dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`,
                  });

                  // TODO: Saved Object Modal requires `id` to be defined so this is a workaround
                  return { id: 'true' };
                }

                // We're adding the viz to a library so we need to save it and then
                // add to a dashboard if necessary
                const response = await doSave({
                  confirmOverwrite: false,
                  isTitleDuplicateConfirmed,
                  onTitleDuplicate,
                  returnToOrigin: resolvedReturnToOrigin,
                  dashboardId: !!dashboardId ? dashboardId : undefined,
                  copyOnSave: newCopyOnSave,
                });
                // If the save wasn't successful, put the original values back.
                if (!response.id || response.error) {
                  savedVis.title = currentTitle;
                }

                return response;
              };

              let selectedTags: string[] = [];
              let tagOptions: React.ReactNode | undefined;

              if (savedObjectsTagging) {
                selectedTags = savedVis.tags || [];
                tagOptions = (
                  <savedObjectsTagging.ui.components.SavedObjectSaveModalTagSelector
                    initialSelection={selectedTags}
                    onTagsSelected={(newSelection) => {
                      selectedTags = newSelection;
                    }}
                    markOptional
                  />
                );
              }

              let saveModal: React.ReactElement<ShowSaveModalMinimalSaveModalProps>;

              // Show simplified modal only when editing embedded panel (has both originatingApp and embeddableId)
              // Dashboard Viz tab has originatingApp but no embeddableId, so shows full modal
              if (isOriginatingFromDashboardPanel && embeddableId) {
                saveModal = (
                  <SavedObjectSaveModalOrigin
                    documentInfo={savedVis || { title: '' }}
                    onSave={onSave}
                    options={tagOptions}
                    getAppNameFromId={stateTransfer.getAppNameFromId}
                    objectType={i18n.translate(
                      'visualizations.topNavMenu.saveVisualizationObjectType',
                      {
                        defaultMessage: 'visualization',
                      }
                    )}
                    onClose={() => {}}
                    originatingApp={originatingApp}
                    returnToOriginSwitchLabel={
                      isOriginatingFromDashboardPanel && embeddableId
                        ? i18n.translate('visualizations.topNavMenu.updatePanel', {
                            defaultMessage: 'Update panel on {originatingAppName}',
                            values: {
                              originatingAppName: stateTransfer.getAppNameFromId(originatingApp!),
                            },
                          })
                        : undefined
                    }
                  />
                );
              } else {
                saveModal = (
                  <SavedObjectSaveModalDashboardWithSaveResult
                    documentInfo={{
                      id: visualizeCapabilities.save ? savedVis?.id : undefined,
                      title: savedVis?.title || '',
                      description: savedVis?.description || '',
                    }}
                    canSaveByReference={Boolean(visualizeCapabilities.save)}
                    onSave={onSave}
                    tagOptions={tagOptions}
                    objectType={i18n.translate(
                      'visualizations.topNavMenu.saveVisualizationObjectType',
                      {
                        defaultMessage: 'visualization',
                      }
                    )}
                    onClose={() => {}}
                    mustCopyOnSaveMessage={
                      savedVis.managed
                        ? i18n.translate('visualizations.topNavMenu.mustCopyOnSave', {
                            defaultMessage:
                              'Elastic manages this visualization. Save any changes to a new visualization.',
                          })
                        : undefined
                    }
                  />
                );
              }

              showSaveModal(saveModal);
            },
          },
        ]
      : []),
    ...(isOriginatingFromDashboardPanel
      ? [
          {
            id: 'saveAndReturn',
            label: i18n.translate(
              'visualizations.topNavMenu.saveAndReturnVisualizationButtonLabel',
              {
                defaultMessage: 'Save and return',
              }
            ),
            emphasize: true,
            iconType: 'checkInCircleFilled',
            description: i18n.translate(
              'visualizations.topNavMenu.saveAndReturnVisualizationButtonAriaLabel',
              {
                defaultMessage: 'Finish editing visualization and return to the last app',
              }
            ),
            testId: 'visualizesaveAndReturnButton',
            disableButton: hasUnappliedChanges,
            tooltip() {
              if (hasUnappliedChanges) {
                return i18n.translate(
                  'visualizations.topNavMenu.saveAndReturnVisualizationDisabledButtonTooltip',
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

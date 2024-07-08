/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBetaBadgeProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import EventEmitter from 'events';
import moment from 'moment';
import { parse } from 'query-string';
import React from 'react';

import { Capabilities } from '@kbn/core/public';
import { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';
import { unhashUrl } from '@kbn/kibana-utils-plugin/public';
import { TopNavMenuData } from '@kbn/navigation-plugin/public';
import {
  LazySavedObjectSaveModalDashboard,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import {
  OnSaveProps,
  SavedObjectSaveModalOrigin,
  SavedObjectSaveOpts,
  showSaveModal,
} from '@kbn/saved-objects-plugin/public';
import { getFullPath, VISUALIZE_EMBEDDABLE_TYPE } from '../..';
import { saveVisualization } from '../../utils/saved_visualize_utils';

import { VisualizeConstants } from '../../../common/constants';
import { VisualizeLocatorParams, VISUALIZE_APP_LOCATOR } from '../../../common/locator';
import { getUiActions } from '../../services';
import { AGG_BASED_VISUALIZATION_TRIGGER, VISUALIZE_EDITOR_TRIGGER } from '../../triggers';
import {
  VisualizeAppStateContainer,
  VisualizeEditorVisInstance,
  VisualizeServices,
} from '../types';
import { getEditBreadcrumbs, getEditServerlessBreadcrumbs } from './breadcrumbs';
import { getVizEditorOriginatingAppUrl } from './utils';

import { NavigateToLensFn, SerializeStateFn } from './use/use_embeddable_api_handler';
import './visualize_navigation.scss';

interface VisualizeCapabilities {
  createShortUrl: boolean;
  delete: boolean;
  save: boolean;
  saveQuery: boolean;
  show: boolean;
}

interface SavedVisMetadata {
  title: string;
  description?: string;
  tags?: string[];
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
  stateTransfer: EmbeddableStateTransfer;
  embeddableId?: string;
  displayEditInLensItem: boolean;
  hideLensBadge: () => void;
  setNavigateToLens: (flag: boolean) => void;
  serializeState: SerializeStateFn;
  navigateToLensFn?: NavigateToLensFn;
  showBadge: boolean;
  eventEmitter?: EventEmitter;
  hasInspector: boolean;
}

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

export const showPublicUrlSwitch = (anonymousUserCapabilities: Capabilities) => {
  if (!anonymousUserCapabilities.visualize) return false;

  const visualize = anonymousUserCapabilities.visualize as unknown as VisualizeCapabilities;

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
    stateTransfer,
    embeddableId,
    displayEditInLensItem,
    hideLensBadge,
    setNavigateToLens,
    navigateToLensFn,
    serializeState,
    showBadge,
    eventEmitter,
    hasInspector,
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
  const { vis } = visInstance;

  /**
   * Called when the user clicks "Save" button.
   */
  async function doSave(
    saveOptions: SavedObjectSaveOpts & { dashboardId?: string; copyOnSave?: boolean },
    metadata?: SavedVisMetadata
  ) {
    const { rawState, references } = serializeState(true);
    const {
      savedVis: serializedVis,
      lastSavedTitle,
      displayName,
      getDisplayName,
      getEsType,
      managed,
    } = rawState;

    const newlyCreated = !Boolean(serializedVis.id) || saveOptions.copyOnSave;
    if (metadata) {
      serializedVis.title = metadata.title;
      serializedVis.description = metadata.description;
    }

    // vis.title was not bound and it's needed to reflect title into visState
    stateContainer.transitions.setVis({
      title: serializedVis.title,
    });

    setHasUnsavedChanges(false);
    const visSavedObjectAttributes = {
      id: serializedVis.id,
      title: serializedVis.title,
      description: serializedVis.description,
      visState: {
        type: serializedVis.type,
        params: serializedVis.params,
        aggs: serializedVis.data.aggs,
        title: serializedVis.title,
      },
      savedSearchId: serializedVis.data.savedSearchId,
      savedSearchRefName: String(serializedVis.data.savedSearchRefName),
      searchSourceFields: serializedVis.data.searchSource,
      uiStateJSON: vis.uiState.toString(),
      lastSavedTitle: lastSavedTitle ?? '',
      displayName: displayName ?? serializedVis.title,
      getDisplayName,
      getEsType,
      managed,
      ...(savedObjectsTagging && { tags: metadata?.tags ?? [] }),
    };

    try {
      const id = await saveVisualization(
        visSavedObjectAttributes,
        saveOptions,
        {
          savedObjectsTagging,
          ...startServices,
        },
        references ?? []
      );

      if (id) {
        toastNotifications.addSuccess({
          title: i18n.translate(
            'visualizations.topNavMenu.saveVisualization.successNotificationText',
            {
              defaultMessage: `Saved ''{visTitle}''`,
              values: {
                visTitle: visSavedObjectAttributes.title,
              },
            }
          ),
          'data-test-subj': 'saveVisualizationSuccess',
        });

        chrome.recentlyAccessed.add(getFullPath(id), visSavedObjectAttributes.title, String(id));

        if ((originatingApp && saveOptions.returnToOrigin) || saveOptions.dashboardId) {
          if (!embeddableId) {
            const appPath = `${VisualizeConstants.EDIT_PATH}/${encodeURIComponent(id)}`;

            // Manually insert a new url so the back button will open the saved visualization.
            history.replace(appPath);
            setActiveUrl(appPath);
          }

          const app = originatingApp || 'dashboards';

          let path;
          if (saveOptions.dashboardId) {
            path =
              saveOptions.dashboardId === 'new' ? '#/create' : `#/view/${saveOptions.dashboardId}`;
          } else if (originatingPath) {
            path = originatingPath;
          }

          if (stateTransfer) {
            stateTransfer.navigateToWithEmbeddablePackage(app, {
              state: {
                type: VISUALIZE_EMBEDDABLE_TYPE,
                input: { savedObjectId: id },
                embeddableId: saveOptions.copyOnSave ? undefined : embeddableId,
                searchSessionId: data.search.session.getSessionId(),
              },
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

          if (lastSavedTitle) {
            chrome.docTitle.change(lastSavedTitle);
            if (serverless?.setBreadcrumbs) {
              serverless.setBreadcrumbs(getEditServerlessBreadcrumbs({}, lastSavedTitle));
            } else {
              chrome.setBreadcrumbs(getEditBreadcrumbs({}, lastSavedTitle));
            }
          }

          if (id !== serializedVis.id) {
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
              visTitle: serializedVis.title,
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

    const { rawState } = serializeState();

    const state = {
      input: rawState,
      embeddableId,
      type: VISUALIZE_EMBEDDABLE_TYPE,
    };

    stateTransfer.navigateToWithEmbeddablePackage(originatingApp, { state, path: originatingPath });
  };

  const navigateToOriginatingApp = () => {
    if (originatingApp) {
      application.navigateToApp(originatingApp, { path: originatingPath });
    }
  };

  const saveButtonLabel =
    !visInstance.savedVis.id && originatingApp
      ? i18n.translate('visualizations.topNavMenu.saveVisualizationToLibraryButtonLabel', {
          defaultMessage: 'Save to library',
        })
      : originatingApp && visInstance.savedVis.id
      ? i18n.translate('visualizations.topNavMenu.saveVisualizationAsButtonLabel', {
          defaultMessage: 'Save as',
        })
      : i18n.translate('visualizations.topNavMenu.saveVisualizationButtonLabel', {
          defaultMessage: 'Save',
        });

  const showSaveButton =
    visualizeCapabilities.save || (!originatingApp && dashboardCapabilities.showWriteControls);

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
              const navigateToLensConfig = await navigateToLensFn?.(
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
                getUiActions()
                  .getTrigger(
                    visInstance.vis.type.group === 'aggbased'
                      ? AGG_BASED_VISUALIZATION_TRIGGER
                      : VISUALIZE_EDITOR_TRIGGER
                  )
                  .exec(updatedWithMeta);
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
        return !hasInspector;
      },
      run: openInspector,
      tooltip() {
        if (!hasInspector) {
          return i18n.translate('visualizations.topNavMenu.openInspectorDisabledButtonTooltip', {
            defaultMessage: `This visualization doesn't support any inspectors.`,
          });
        }
      },
    },
    {
      id: 'share',
      label: i18n.translate('visualizations.topNavMenu.shareVisualizationButtonLabel', {
        defaultMessage: 'share',
      }),
      description: i18n.translate('visualizations.topNavMenu.shareVisualizationButtonAriaLabel', {
        defaultMessage: 'Share Visualization',
      }),
      testId: 'shareTopNavButton',
      run: (anchorElement) => {
        if (share) {
          const currentState = stateContainer.getState();
          const searchParams = parse(history.location.search);
          const serializedVis = serializeState().rawState.savedVis;
          const params: VisualizeLocatorParams = {
            visId: serializedVis.id,
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
          share.toggleShareContextMenu({
            anchorElement,
            allowEmbed: true,
            allowShortUrl: Boolean(visualizeCapabilities.createShortUrl),
            shareableUrl: unhashUrl(window.location.href),
            objectId: serializedVis.id,
            objectType: 'visualization',
            objectTypeMeta: {
              title: i18n.translate('visualizations.share.shareModal.title', {
                defaultMessage: 'Share this visualization',
              }),
            },
            sharingData: {
              title:
                serializedVis?.title ||
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
            showPublicUrlSwitch,
            toasts: toastNotifications,
          });
        }
      },
      // disable the Share button if no action specified and for byValue visualizations
      disableButton: !share || Boolean(!visInstance.savedVis.id && originatingApp),
    },
    ...(originatingApp
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
            iconType: originatingApp ? undefined : 'save',
            label: saveButtonLabel,
            emphasize: !originatingApp,
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
              const { rawState } = serializeState();
              const onSave = async ({
                newTitle,
                newCopyOnSave,
                isTitleDuplicateConfirmed,
                onTitleDuplicate,
                newDescription,
                returnToOrigin,
                dashboardId,
                addToLibrary,
                ...rest
              }: OnSaveProps & { returnToOrigin?: boolean } & {
                dashboardId?: string | null;
                addToLibrary?: boolean;
              }) => {
                const metadata: SavedVisMetadata = {
                  title: newTitle,
                  description: newDescription,
                };

                if (savedObjectsTagging) {
                  metadata.tags = selectedTags;
                }

                const saveOptions = {
                  confirmOverwrite: false,
                  isTitleDuplicateConfirmed,
                  onTitleDuplicate,
                  returnToOrigin,
                  dashboardId: !!dashboardId ? dashboardId : undefined,
                  copyOnSave: newCopyOnSave,
                };

                // If we're adding to a dashboard and not saving to library,
                // we'll want to use a by-value operation
                if (dashboardId && !addToLibrary) {
                  const appPath = `${VisualizeConstants.LANDING_PAGE_PATH}`;

                  // Manually insert a new url so the back button will open the saved visualization.
                  history.replace(appPath);
                  setActiveUrl(appPath);

                  const state = {
                    input: rawState,
                    embeddableId,
                    type: VISUALIZE_EMBEDDABLE_TYPE,
                    searchSessionId: data.search.session.getSessionId(),
                  };

                  const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

                  stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
                    state,
                    path,
                  });

                  // TODO: Saved Object Modal requires `id` to be defined so this is a workaround
                  return { id: true };
                }

                // We're adding the viz to a library so we need to save it and then
                // add to a dashboard if necessary
                const response = await doSave(saveOptions, metadata);

                return response;
              };

              let selectedTags: string[] = [];
              let tagOptions: React.ReactNode | undefined;

              if (savedObjectsTagging) {
                selectedTags = [];
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

              let saveModal;

              if (originatingApp) {
                saveModal = (
                  <SavedObjectSaveModalOrigin
                    documentInfo={rawState.savedVis || { title: '' }}
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
                      originatingApp && embeddableId
                        ? i18n.translate('visualizations.topNavMenu.updatePanel', {
                            defaultMessage: 'Update panel on {originatingAppName}',
                            values: {
                              originatingAppName: stateTransfer.getAppNameFromId(originatingApp),
                            },
                          })
                        : undefined
                    }
                  />
                );
              } else {
                saveModal = (
                  <SavedObjectSaveModalDashboard
                    documentInfo={{
                      id: visualizeCapabilities.save ? rawState.savedVis?.id : undefined,
                      title: rawState.savedVis?.title || '',
                      description: rawState.savedVis?.description || '',
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
                      rawState.managed
                        ? i18n.translate('visualizations.topNavMenu.mustCopyOnSave', {
                            defaultMessage:
                              'Elastic manages this visualization. Save any changes to a new visualization.',
                          })
                        : undefined
                    }
                  />
                );
              }

              showSaveModal(saveModal, presentationUtil.ContextProvider);
            },
          },
        ]
      : []),
    ...(originatingApp
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
              const { rawState } = serializeState();
              const serializedVis = rawState.savedVis;
              if (!serializedVis.id) {
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

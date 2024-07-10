/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './editor_menu.scss';

import React, { useEffect, useRef, useCallback, useMemo } from 'react';

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { type Subscription, AsyncSubject, from, defer, map, forkJoin, Observable } from 'rxjs';
import type { IconType } from '@elastic/eui';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { EmbeddableFactory, COMMON_EMBEDDABLE_GROUPING } from '@kbn/embeddable-plugin/public';
import { type BaseVisType, VisGroups, type VisTypeAlias } from '@kbn/visualizations-plugin/public';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';
import { PresentationContainer } from '@kbn/presentation-containers';

import {
  getAddPanelActionMenuItemsGroup,
  type PanelSelectionMenuItem,
  type GroupedAddPanelActions,
} from './add_panel_action_menu_items';
import {
  DashboardPanelSelectionListFlyout,
  type DashboardPanelSelectionListFlyoutProps,
} from './dashboard_panel_selection_flyout';
import { pluginServices } from '../../services/plugin_services';
import type { DashboardServices } from '../../services/types';
import { useDashboardAPI } from '../dashboard_app';

export interface FactoryGroup {
  id: string;
  appName: string;
  icon?: IconType;
  factories: EmbeddableFactory[];
  order: number;
}

interface UnwrappedEmbeddableFactory {
  factory: EmbeddableFactory;
  isEditable: boolean;
}

export type GetEmbeddableFactoryMenuItem = ReturnType<typeof getEmbeddableFactoryMenuItemProvider>;

interface EditorMenuProps {
  api: PresentationContainer;
  isDisabled?: boolean;
  createNewVisType: (visType: BaseVisType | VisTypeAlias) => () => void;
}

interface UseGetDashboardPanelsArgs extends Pick<EditorMenuProps, 'createNewVisType'> {
  embeddableAPI: EditorMenuProps['api'];
  dashboardAPI: ReturnType<typeof useDashboardAPI>;
}

export const getEmbeddableFactoryMenuItemProvider =
  (api: PresentationContainer, closePopover: () => void) =>
  (factory: EmbeddableFactory): PanelSelectionMenuItem => {
    const icon = factory?.getIconType ? factory.getIconType() : 'empty';

    return {
      id: factory.type,
      name: factory.getDisplayName(),
      icon,
      description: factory.getDescription?.(),
      onClick: async () => {
        closePopover();
        api.addNewPanel({ panelType: factory.type }, true);
      },
      'data-test-subj': `createNew-${factory.type}`,
      order: factory.order ?? 0,
    };
  };

const sortGroupPanelsByOrder = <T extends { order: number }>(panelGroups: T[]): T[] => {
  return panelGroups.sort(
    // larger number sorted to the top
    (panelGroupA, panelGroupB) => panelGroupB.order - panelGroupA.order
  );
};

export const mergeGroupedItemsProvider =
  (getEmbeddableFactoryMenuItem: GetEmbeddableFactoryMenuItem) =>
  (
    factoryGroupMap: Record<string, FactoryGroup>,
    groupedAddPanelAction: Record<string, GroupedAddPanelActions>
  ) => {
    const panelGroups: GroupedAddPanelActions[] = [];

    new Set(Object.keys(factoryGroupMap).concat(Object.keys(groupedAddPanelAction))).forEach(
      (groupId) => {
        const dataTestSubj = `dashboardEditorMenu-${groupId}Group`;

        const factoryGroup = factoryGroupMap[groupId];
        const addPanelGroup = groupedAddPanelAction[groupId];

        if (factoryGroup && addPanelGroup) {
          panelGroups.push({
            id: factoryGroup.id,
            title: factoryGroup.appName,
            'data-test-subj': dataTestSubj,
            order: factoryGroup.order,
            items: [
              ...factoryGroup.factories.map(getEmbeddableFactoryMenuItem),
              ...(addPanelGroup?.items ?? []),
            ],
          });
        } else if (factoryGroup) {
          panelGroups.push({
            id: factoryGroup.id,
            title: factoryGroup.appName,
            'data-test-subj': dataTestSubj,
            order: factoryGroup.order,
            items: factoryGroup.factories.map(getEmbeddableFactoryMenuItem),
          });
        } else if (addPanelGroup) {
          panelGroups.push(addPanelGroup);
        }
      }
    );

    return panelGroups;
  };

export const useGetDashboardPanels = ({
  dashboardAPI,
  embeddableAPI,
  createNewVisType,
}: UseGetDashboardPanelsArgs) => {
  const panelsComputeResultCache = useRef(new AsyncSubject<GroupedAddPanelActions[]>());
  const panelsComputeSubscription = useRef<Subscription | null>(null);

  const {
    uiActions,
    embeddable,
    visualizations: { getAliases: getVisTypeAliases, getByGroup: getVisTypesByGroup },
  } = pluginServices.getServices();

  const getSortedVisTypesByGroup = (group: VisGroups) =>
    getVisTypesByGroup(group)
      .sort((a: BaseVisType | VisTypeAlias, b: BaseVisType | VisTypeAlias) => {
        const labelA = 'titleInWizard' in a ? a.titleInWizard || a.title : a.title;
        const labelB = 'titleInWizard' in b ? b.titleInWizard || a.title : a.title;
        if (labelA < labelB) {
          return -1;
        }
        if (labelA > labelB) {
          return 1;
        }
        return 0;
      })
      .filter(({ disableCreate }: BaseVisType) => !disableCreate);

  const promotedVisTypes = getSortedVisTypesByGroup(VisGroups.PROMOTED);
  const toolVisTypes = getSortedVisTypesByGroup(VisGroups.TOOLS);
  const legacyVisTypes = getSortedVisTypesByGroup(VisGroups.LEGACY);

  const visTypeAliases = getVisTypeAliases()
    .sort(({ promotion: a = false }: VisTypeAlias, { promotion: b = false }: VisTypeAlias) =>
      a === b ? 0 : a ? -1 : 1
    )
    .filter(({ disableCreate }: VisTypeAlias) => !disableCreate);

  const augmentedCreateNewVisType = useCallback(
    (visType: Parameters<typeof createNewVisType>[0], cb: () => void) => {
      const visClickHandler = createNewVisType(visType);
      return () => {
        visClickHandler();
        cb();
      };
    },
    [createNewVisType]
  );

  const getVisTypeMenuItem = useCallback(
    (onClickCb: () => void, visType: BaseVisType): PanelSelectionMenuItem => {
      const {
        name,
        title,
        titleInWizard,
        description,
        icon = 'empty',
        isDeprecated,
        order,
      } = visType;
      return {
        id: name,
        name: titleInWizard || title,
        isDeprecated,
        icon,
        onClick: augmentedCreateNewVisType(visType, onClickCb),
        'data-test-subj': `visType-${name}`,
        description,
        order,
      };
    },
    [augmentedCreateNewVisType]
  );

  const getVisTypeAliasMenuItem = useCallback(
    (onClickCb: () => void, visTypeAlias: VisTypeAlias): PanelSelectionMenuItem => {
      const { name, title, description, icon = 'empty', order } = visTypeAlias;

      return {
        id: name,
        name: title,
        icon,
        onClick: augmentedCreateNewVisType(visTypeAlias, onClickCb),
        'data-test-subj': `visType-${name}`,
        description,
        order: order ?? 0,
      };
    },
    [augmentedCreateNewVisType]
  );

  const groupUnwrappedEmbeddableFactoriesMap$ = useMemo(
    () =>
      defer(() => {
        return from(
          Promise.all(
            Array.from(embeddable.getEmbeddableFactories()).map<
              Promise<UnwrappedEmbeddableFactory>
            >(async (factory) => ({
              factory,
              isEditable: await factory.isEditable(),
            }))
          )
        ).pipe(
          map((result) =>
            result.filter(
              ({ isEditable, factory: { type, canCreateNew, isContainerType } }) =>
                isEditable && !isContainerType && canCreateNew() && type !== 'visualization'
            )
          ),
          map((factories) => {
            const _factoryGroupMap: Record<string, FactoryGroup> = {};

            factories.forEach(({ factory }) => {
              const { grouping } = factory;

              if (grouping) {
                grouping.forEach((group) => {
                  if (_factoryGroupMap[group.id]) {
                    _factoryGroupMap[group.id].factories.push(factory);
                  } else {
                    _factoryGroupMap[group.id] = {
                      id: group.id,
                      appName: group.getDisplayName
                        ? group.getDisplayName({ embeddable: dashboardAPI })
                        : group.id,
                      icon: group.getIconType?.({ embeddable: dashboardAPI }),
                      factories: [factory],
                      order: group.order ?? 0,
                    };
                  }
                });
              } else {
                const fallbackGroup = COMMON_EMBEDDABLE_GROUPING.other;

                if (!_factoryGroupMap[fallbackGroup.id]) {
                  _factoryGroupMap[fallbackGroup.id] = {
                    id: fallbackGroup.id,
                    appName: fallbackGroup.getDisplayName
                      ? fallbackGroup.getDisplayName({ embeddable: dashboardAPI })
                      : fallbackGroup.id,
                    icon: fallbackGroup.getIconType?.({ embeddable: dashboardAPI }) || 'empty',
                    factories: [],
                    order: fallbackGroup.order ?? 0,
                  };
                }

                _factoryGroupMap[fallbackGroup.id].factories.push(factory);
              }
            });

            return _factoryGroupMap;
          })
        );
      }),
    [dashboardAPI, embeddable]
  );

  const addPanelAction$ = useMemo(
    () =>
      defer(() => {
        return from(
          uiActions?.getTriggerCompatibleActions?.(ADD_PANEL_TRIGGER, {
            embeddable: embeddableAPI,
          }) ?? []
        );
      }),
    [embeddableAPI, uiActions]
  );

  const computeAvailablePanels = useCallback(
    (closeFlyout: () => void) => {
      if (!panelsComputeSubscription.current) {
        panelsComputeSubscription.current = forkJoin([
          groupUnwrappedEmbeddableFactoriesMap$,
          addPanelAction$,
        ])
          .pipe(
            map(([factoryGroupMap, addPanelActions]) => {
              const groupedAddPanelAction = getAddPanelActionMenuItemsGroup(
                embeddableAPI,
                addPanelActions,
                closeFlyout
              );

              const getEmbeddableFactoryMenuItem = getEmbeddableFactoryMenuItemProvider(
                embeddableAPI,
                closeFlyout
              );

              return mergeGroupedItemsProvider(getEmbeddableFactoryMenuItem)(
                factoryGroupMap,
                groupedAddPanelAction
              );
            }),
            map((mergedPanelGroups) => {
              return sortGroupPanelsByOrder<GroupedAddPanelActions>(mergedPanelGroups).map(
                (panelGroup) => {
                  switch (panelGroup.id) {
                    case 'visualizations': {
                      return {
                        ...panelGroup,
                        items: sortGroupPanelsByOrder<PanelSelectionMenuItem>(
                          (panelGroup.items ?? []).concat(
                            // TODO: actually add grouping to vis type alias so we wouldn't randomly display an unintended item
                            visTypeAliases.map(getVisTypeAliasMenuItem.bind(null, closeFlyout)),
                            promotedVisTypes.map(getVisTypeMenuItem.bind(null, closeFlyout))
                          )
                        ),
                      };
                    }
                    case COMMON_EMBEDDABLE_GROUPING.legacy.id: {
                      return {
                        ...panelGroup,
                        items: sortGroupPanelsByOrder<PanelSelectionMenuItem>(
                          (panelGroup.items ?? []).concat(
                            legacyVisTypes.map(getVisTypeMenuItem.bind(null, closeFlyout))
                          )
                        ),
                      };
                    }
                    case COMMON_EMBEDDABLE_GROUPING.annotation.id: {
                      return {
                        ...panelGroup,
                        items: sortGroupPanelsByOrder<PanelSelectionMenuItem>(
                          (panelGroup.items ?? []).concat(
                            toolVisTypes.map(getVisTypeMenuItem.bind(null, closeFlyout))
                          )
                        ),
                      };
                    }
                    default: {
                      return {
                        ...panelGroup,
                        items: sortGroupPanelsByOrder(panelGroup.items),
                      };
                    }
                  }
                }
              );
            })
          )
          .subscribe(panelsComputeResultCache.current);
      }
    },
    [
      embeddableAPI,
      addPanelAction$,
      groupUnwrappedEmbeddableFactoriesMap$,
      getVisTypeMenuItem,
      getVisTypeAliasMenuItem,
      toolVisTypes,
      legacyVisTypes,
      promotedVisTypes,
      visTypeAliases,
    ]
  );

  return useMemo<[Observable<GroupedAddPanelActions[]>, typeof computeAvailablePanels]>(
    () => [panelsComputeResultCache.current.asObservable(), computeAvailablePanels],
    [computeAvailablePanels]
  );
};

export const EditorMenu = ({ createNewVisType, isDisabled, api }: EditorMenuProps) => {
  const flyoutRef = useRef<ReturnType<DashboardServices['overlays']['openFlyout']>>();
  const dashboardAPI = useDashboardAPI();

  const {
    overlays,
    analytics,
    settings: { i18n: i18nStart, theme },
  } = pluginServices.getServices();

  const [panels$, fetchDashboardPanels] = useGetDashboardPanels({
    dashboardAPI,
    createNewVisType,
    embeddableAPI: api,
  });

  useEffect(() => {
    // ensure opened dashboard is closed if a navigation event happens;
    return () => {
      flyoutRef.current?.close();
    };
  }, []);

  const openDashboardPanelSelectionFlyout = useCallback(
    function openDashboardPanelSelectionFlyout() {
      const flyoutPanelPaddingSize: DashboardPanelSelectionListFlyoutProps['paddingSize'] = 'l';

      const mount = toMountPoint(
        React.createElement(function () {
          const closeFlyout = () => flyoutRef.current?.close();

          // kick off dashboard panel fetch
          fetchDashboardPanels(closeFlyout);

          return (
            <DashboardPanelSelectionListFlyout
              close={closeFlyout}
              {...{
                paddingSize: flyoutPanelPaddingSize,
                dashboardPanels$: panels$,
              }}
            />
          );
        }),
        { analytics, theme, i18n: i18nStart }
      );

      flyoutRef.current = overlays.openFlyout(mount, {
        size: 'm',
        maxWidth: 500,
        paddingSize: flyoutPanelPaddingSize,
        'aria-labelledby': 'addPanelsFlyout',
        'data-test-subj': 'dashboardPanelSelectionFlyout',
      });
    },
    [analytics, theme, i18nStart, overlays, fetchDashboardPanels, panels$]
  );

  return (
    <ToolbarButton
      data-test-subj="dashboardEditorMenuButton"
      isDisabled={isDisabled}
      iconType="plusInCircle"
      label={i18n.translate('dashboard.solutionToolbar.editorMenuButtonLabel', {
        defaultMessage: 'Add panel',
      })}
      onClick={openDashboardPanelSelectionFlyout}
      size="s"
    />
  );
};

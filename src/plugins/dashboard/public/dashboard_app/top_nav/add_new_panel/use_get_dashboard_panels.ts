/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useMemo, useRef, useCallback } from 'react';
import type { IconType } from '@elastic/eui';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { type Subscription, AsyncSubject, from, defer, map, forkJoin, lastValueFrom } from 'rxjs';
import { EmbeddableFactory, COMMON_EMBEDDABLE_GROUPING } from '@kbn/embeddable-plugin/public';
import { PresentationContainer } from '@kbn/presentation-containers';
import { type BaseVisType, VisGroups, type VisTypeAlias } from '@kbn/visualizations-plugin/public';

import { pluginServices } from '../../../services/plugin_services';
import { useDashboardAPI } from '../../dashboard_app';
import {
  getAddPanelActionMenuItemsGroup,
  type PanelSelectionMenuItem,
  type GroupedAddPanelActions,
} from './add_panel_action_menu_items';

interface UseGetDashboardPanelsArgs {
  api: PresentationContainer;
  dashboardAPI: ReturnType<typeof useDashboardAPI>;
  createNewVisType: (visType: BaseVisType | VisTypeAlias) => () => void;
}

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

export type GetEmbeddableFactoryMenuItem = ReturnType<typeof getEmbeddableFactoryMenuItemProvider>;

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
  api: embeddableAPI,
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
          Promise.allSettled(
            Array.from(embeddable.getEmbeddableFactories()).map<
              Promise<UnwrappedEmbeddableFactory>
            >(async (factory) => ({
              factory,
              isEditable: await factory.isEditable(),
            }))
          )
        ).pipe(
          map((result) =>
            result.reduce((acc, cur) => {
              if (
                cur.status === 'fulfilled' &&
                cur.value &&
                cur.value.isEditable &&
                !cur.value.factory.isContainerType &&
                cur.value.factory.canCreateNew() &&
                cur.value.factory.type !== 'visualization'
              ) {
                acc.push(cur.value);
              }

              return acc;
            }, [] as UnwrappedEmbeddableFactory[])
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

  return useCallback(
    (...args: Parameters<typeof computeAvailablePanels>) => {
      computeAvailablePanels(...args);
      return lastValueFrom(panelsComputeResultCache.current.asObservable());
    },
    [computeAvailablePanels]
  );
};

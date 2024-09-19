/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IconType } from '@elastic/eui';
import { COMMON_EMBEDDABLE_GROUPING, EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { PresentationContainer } from '@kbn/presentation-containers';
import { ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { VisGroups, type BaseVisType, type VisTypeAlias } from '@kbn/visualizations-plugin/public';
import { useCallback, useMemo, useRef } from 'react';
import { AsyncSubject, defer, from, lastValueFrom, map, type Subscription } from 'rxjs';

import { visualizationsService } from '../../../services/kibana_services';
import { pluginServices } from '../../../services/plugin_services';
import {
  getAddPanelActionMenuItemsGroup,
  type GroupedAddPanelActions,
  type PanelSelectionMenuItem,
} from './add_panel_action_menu_items';

interface UseGetDashboardPanelsArgs {
  api: PresentationContainer;
  createNewVisType: (visType: BaseVisType | VisTypeAlias) => () => void;
}

export interface FactoryGroup {
  id: string;
  appName: string;
  icon?: IconType;
  factories: EmbeddableFactory[];
  order: number;
}

const sortGroupPanelsByOrder = <T extends { order: number }>(panelGroups: T[]): T[] => {
  return panelGroups.sort(
    // larger number sorted to the top
    (panelGroupA, panelGroupB) => panelGroupB.order - panelGroupA.order
  );
};

export const useGetDashboardPanels = ({ api, createNewVisType }: UseGetDashboardPanelsArgs) => {
  const panelsComputeResultCache = useRef(new AsyncSubject<GroupedAddPanelActions[]>());
  const panelsComputeSubscription = useRef<Subscription | null>(null);

  const { uiActions } = pluginServices.getServices();

  const getSortedVisTypesByGroup = (group: VisGroups) =>
    visualizationsService
      .getByGroup(group)
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

  const visTypeAliases = visualizationsService
    .getAliases()
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

  const addPanelAction$ = useMemo(
    () =>
      defer(() => {
        return from(
          uiActions?.getTriggerCompatibleActions?.(ADD_PANEL_TRIGGER, {
            embeddable: api,
          }) ?? []
        );
      }),
    [api, uiActions]
  );

  const computeAvailablePanels = useCallback(
    (onPanelSelected: () => void) => {
      if (!panelsComputeSubscription.current) {
        panelsComputeSubscription.current = addPanelAction$
          .pipe(
            map((addPanelActions) =>
              getAddPanelActionMenuItemsGroup(api, addPanelActions, onPanelSelected)
            ),
            map((groupedAddPanelAction) => {
              return sortGroupPanelsByOrder<GroupedAddPanelActions>(
                Object.values(groupedAddPanelAction)
              ).map((panelGroup) => {
                switch (panelGroup.id) {
                  case 'visualizations': {
                    return {
                      ...panelGroup,
                      items: sortGroupPanelsByOrder<PanelSelectionMenuItem>(
                        (panelGroup.items ?? []).concat(
                          // TODO: actually add grouping to vis type alias so we wouldn't randomly display an unintended item
                          visTypeAliases.map(getVisTypeAliasMenuItem.bind(null, onPanelSelected)),
                          promotedVisTypes.map(getVisTypeMenuItem.bind(null, onPanelSelected))
                        )
                      ),
                    };
                  }
                  case COMMON_EMBEDDABLE_GROUPING.legacy.id: {
                    return {
                      ...panelGroup,
                      items: sortGroupPanelsByOrder<PanelSelectionMenuItem>(
                        (panelGroup.items ?? []).concat(
                          legacyVisTypes.map(getVisTypeMenuItem.bind(null, onPanelSelected))
                        )
                      ),
                    };
                  }
                  case COMMON_EMBEDDABLE_GROUPING.annotation.id: {
                    return {
                      ...panelGroup,
                      items: sortGroupPanelsByOrder<PanelSelectionMenuItem>(
                        (panelGroup.items ?? []).concat(
                          toolVisTypes.map(getVisTypeMenuItem.bind(null, onPanelSelected))
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
              });
            })
          )
          .subscribe(panelsComputeResultCache.current);
      }
    },
    [
      api,
      addPanelAction$,
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

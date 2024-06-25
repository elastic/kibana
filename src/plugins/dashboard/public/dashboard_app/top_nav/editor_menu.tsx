/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './editor_menu.scss';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { type IconType } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { type Action, ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';
import { PresentationContainer } from '@kbn/presentation-containers';
import { type BaseVisType, VisGroups, type VisTypeAlias } from '@kbn/visualizations-plugin/public';
import { EmbeddableFactory, COMMON_EMBEDDABLE_GROUPING } from '@kbn/embeddable-plugin/public';
import { pluginServices } from '../../services/plugin_services';
import {
  getAddPanelActionMenuItemsGroup,
  type PanelSelectionMenuItem,
  type GroupedAddPanelActions,
} from './add_panel_action_menu_items';
import { openDashboardPanelSelectionFlyout } from './open_dashboard_panel_selection_flyout';
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

interface EditorMenuProps {
  api: PresentationContainer;
  isDisabled?: boolean;
  /** Handler for creating new visualization of a specified type */
  createNewVisType: (visType: BaseVisType | VisTypeAlias) => () => void;
}

export const EditorMenu = ({ createNewVisType, isDisabled, api }: EditorMenuProps) => {
  const isMounted = useRef(false);
  const flyoutRef = useRef<ReturnType<DashboardServices['overlays']['openFlyout']>>();
  const dashboard = useDashboardAPI();

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      flyoutRef.current?.close();
    };
  }, []);

  const {
    embeddable,
    visualizations: { getAliases: getVisTypeAliases, getByGroup: getVisTypesByGroup },
    uiActions,
  } = pluginServices.getServices();

  const [unwrappedEmbeddableFactories, setUnwrappedEmbeddableFactories] = useState<
    UnwrappedEmbeddableFactory[]
  >([]);

  const [addPanelActions, setAddPanelActions] = useState<Array<Action<object>> | undefined>(
    undefined
  );

  const embeddableFactories = useMemo(
    () => Array.from(embeddable.getEmbeddableFactories()),
    [embeddable]
  );

  useEffect(() => {
    Promise.all(
      embeddableFactories.map<Promise<UnwrappedEmbeddableFactory>>(async (factory) => ({
        factory,
        isEditable: await factory.isEditable(),
      }))
    ).then((factories) => {
      setUnwrappedEmbeddableFactories(factories);
    });
  }, [embeddableFactories]);

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

  const factories = unwrappedEmbeddableFactories.filter(
    ({ isEditable, factory: { type, canCreateNew, isContainerType } }) =>
      isEditable && !isContainerType && canCreateNew() && type !== 'visualization'
  );

  const factoryGroupMap: Record<string, FactoryGroup> = {};

  // Retrieve ADD_PANEL_TRIGGER actions
  useEffect(() => {
    async function loadPanelActions() {
      const registeredActions = await uiActions?.getTriggerCompatibleActions?.(ADD_PANEL_TRIGGER, {
        embeddable: api,
      });

      if (isMounted.current) {
        setAddPanelActions(registeredActions);
      }
    }
    loadPanelActions();
  }, [uiActions, api]);

  factories.forEach(({ factory }) => {
    const { grouping } = factory;

    if (grouping) {
      grouping.forEach((group) => {
        if (factoryGroupMap[group.id]) {
          factoryGroupMap[group.id].factories.push(factory);
        } else {
          factoryGroupMap[group.id] = {
            id: group.id,
            appName: group.getDisplayName
              ? group.getDisplayName({ embeddable: dashboard })
              : group.id,
            icon: group.getIconType?.({ embeddable: dashboard }),
            factories: [factory],
            order: group.order ?? 0,
          };
        }
      });
    } else {
      const fallbackGroup = COMMON_EMBEDDABLE_GROUPING.other;

      if (!factoryGroupMap[fallbackGroup.id]) {
        factoryGroupMap[fallbackGroup.id] = {
          id: fallbackGroup.id,
          appName: fallbackGroup.getDisplayName
            ? fallbackGroup.getDisplayName({ embeddable: dashboard })
            : fallbackGroup.id,
          icon: fallbackGroup.getIconType?.({ embeddable: dashboard }) || 'empty',
          factories: [],
          order: fallbackGroup.order ?? 0,
        };
      }

      factoryGroupMap[fallbackGroup.id].factories.push(factory);
    }
  });

  const augmentedCreateNewVisType = (
    visType: Parameters<EditorMenuProps['createNewVisType']>[0],
    cb: () => void
  ) => {
    const visClickHandler = createNewVisType(visType);
    return () => {
      visClickHandler();
      cb();
    };
  };

  const getVisTypeMenuItem = (
    onClickCb: () => void,
    visType: BaseVisType
  ): PanelSelectionMenuItem => {
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
  };

  const getVisTypeAliasMenuItem = (
    onClickCb: () => void,
    visTypeAlias: VisTypeAlias
  ): PanelSelectionMenuItem => {
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
  };

  const getEditorMenuPanels = (closeFlyout: () => void): GroupedAddPanelActions[] => {
    const getEmbeddableFactoryMenuItem = getEmbeddableFactoryMenuItemProvider(api, closeFlyout);

    const groupedAddPanelAction = getAddPanelActionMenuItemsGroup(
      api,
      addPanelActions,
      closeFlyout
    );

    const initialPanelGroups = mergeGroupedItemsProvider(getEmbeddableFactoryMenuItem)(
      factoryGroupMap,
      groupedAddPanelAction
    );

    // enhance panel groups
    return sortGroupPanelsByOrder<GroupedAddPanelActions>(initialPanelGroups).map((panelGroup) => {
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
    });
  };

  return (
    <ToolbarButton
      data-test-subj="dashboardEditorMenuButton"
      isDisabled={isDisabled}
      iconType="plusInCircle"
      label={i18n.translate('dashboard.solutionToolbar.editorMenuButtonLabel', {
        defaultMessage: 'Add panel',
      })}
      onClick={() => {
        flyoutRef.current = openDashboardPanelSelectionFlyout({
          getPanels: getEditorMenuPanels,
        });
      }}
      size="s"
    />
  );
};

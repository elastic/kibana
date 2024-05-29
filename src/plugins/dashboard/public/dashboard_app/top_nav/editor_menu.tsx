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
import type { Action } from '@kbn/ui-actions-plugin/public';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';
import { PresentationContainer } from '@kbn/presentation-containers';
import { type BaseVisType, VisGroups, type VisTypeAlias } from '@kbn/visualizations-plugin/public';
import { EmbeddableFactory, COMMON_EMBEDDABLE_GROUPING } from '@kbn/embeddable-plugin/public';
import { pluginServices } from '../../services/plugin_services';
import { ADD_PANEL_TRIGGER } from '../../triggers';
import {
  getAddPanelActionMenuItemsGroup,
  type GroupedAddPanelActions,
  type PanelSelectionMenuItem,
  type GroupedAddPanelActionsIncPriority,
} from './add_panel_action_menu_items';
import { openDashboardPanelSelectionFlyout } from './open_dashboard_panel_selection_flyout';
export interface FactoryGroup extends Pick<GroupedAddPanelActionsIncPriority, 'placementPriority'> {
  id: string;
  appName: string;
  icon?: IconType;
  factories: EmbeddableFactory[];
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
    };
  };

const sortGroupPanelsByPlacementPriority = (
  panelGroups: GroupedAddPanelActionsIncPriority[]
): GroupedAddPanelActions[] => {
  return (
    panelGroups
      .sort(
        // bigger number sorted to the top
        (panelGroupA, panelGroupB) => panelGroupB.placementPriority - panelGroupA.placementPriority
      )
      // strip out placement priority before return
      .map(({ placementPriority, ...group }) => group)
  );
};

export const mergeGroupedItemsProvider =
  (getEmbeddableFactoryMenuItem: GetEmbeddableFactoryMenuItem) =>
  (
    factoryGroupMap: Record<string, FactoryGroup>,
    groupedAddPanelAction: Record<string, GroupedAddPanelActionsIncPriority>
  ) => {
    const panelGroups: GroupedAddPanelActionsIncPriority[] = [];

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
            placementPriority: factoryGroup.placementPriority,
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
            placementPriority: factoryGroup.placementPriority,
            items: factoryGroup.factories.map(getEmbeddableFactoryMenuItem),
          });
        } else if (addPanelGroup) {
          panelGroups.push(addPanelGroup);
        }
      }
    );

    return panelGroups;
  };

export const EditorMenu = ({
  createNewVisType,
  isDisabled,
  api,
}: {
  api: PresentationContainer;
  isDisabled?: boolean;
  /** Handler for creating new visualization of a specified type */
  createNewVisType: (visType: BaseVisType | VisTypeAlias) => () => void;
}) => {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
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
            appName: group.getDisplayName ? group.getDisplayName({ embeddable }) : group.id,
            icon: group.getIconType?.({ embeddable }),
            factories: [factory],
            placementPriority: group.placementPriority ?? 0,
          };
        }
      });
    }
  });

  const getVisTypeMenuItem = (visType: BaseVisType): PanelSelectionMenuItem => {
    const { name, title, titleInWizard, description, icon = 'empty', isDeprecated } = visType;
    return {
      id: name,
      name: titleInWizard || title,
      isDeprecated,
      icon,
      onClick: createNewVisType(visType),
      'data-test-subj': `visType-${name}`,
      description,
    };
  };

  const getVisTypeAliasMenuItem = (visTypeAlias: VisTypeAlias): PanelSelectionMenuItem => {
    const { name, title, description, icon = 'empty' } = visTypeAlias;

    return {
      id: name,
      name: title,
      icon,
      onClick: createNewVisType(visTypeAlias),
      'data-test-subj': `visType-${name}`,
      description,
    };
  };

  const getEditorMenuPanels = (closePopover: () => void): GroupedAddPanelActions[] => {
    const getEmbeddableFactoryMenuItem = getEmbeddableFactoryMenuItemProvider(api, closePopover);

    const groupedAddPanelAction = getAddPanelActionMenuItemsGroup(
      api,
      addPanelActions,
      closePopover
    );

    const initialPanelGroups = mergeGroupedItemsProvider(getEmbeddableFactoryMenuItem)(
      factoryGroupMap,
      groupedAddPanelAction
    );

    // enhance panel groups
    return sortGroupPanelsByPlacementPriority(initialPanelGroups).map((panelGroup) => {
      switch (panelGroup.id) {
        case 'visualizations': {
          return {
            ...panelGroup,
            items: (panelGroup.items ?? []).concat(
              promotedVisTypes.map(getVisTypeMenuItem),
              // TODO: actually add grouping to vis type alias so we wouldn't randomly display an unintended item
              visTypeAliases.map(getVisTypeAliasMenuItem)
            ),
          };
        }
        case COMMON_EMBEDDABLE_GROUPING.legacy.id: {
          return {
            ...panelGroup,
            items: (panelGroup.items ?? []).concat(legacyVisTypes.map(getVisTypeMenuItem)),
          };
        }
        case COMMON_EMBEDDABLE_GROUPING.annotation.id: {
          return {
            ...panelGroup,
            items: (panelGroup.items ?? []).concat(toolVisTypes.map(getVisTypeMenuItem)),
          };
        }
        default: {
          return panelGroup;
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
      onClick={() =>
        openDashboardPanelSelectionFlyout({
          getPanels: getEditorMenuPanels,
        })
      }
      size="s"
    />
  );
};

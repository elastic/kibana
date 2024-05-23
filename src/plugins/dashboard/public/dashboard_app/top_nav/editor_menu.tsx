/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import './editor_menu.scss';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  EuiBadge,
  EuiContextMenuItemIcon,
  type EuiContextMenuPanelDescriptor,
  type EuiContextMenuPanelItemDescriptor,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
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
} from './add_panel_action_menu_items';
import { openDashboardPanelSelectionFlyout } from './open_dashboard_panel_selection_flyout';
export interface FactoryGroup {
  id: string;
  appName: string;
  icon: EuiContextMenuItemIcon;
  panelId: number;
  factories: EmbeddableFactory[];
}

interface UnwrappedEmbeddableFactory {
  factory: EmbeddableFactory;
  isEditable: boolean;
}

export type GetEmbeddableFactoryMenuItem = ReturnType<typeof getEmbeddableFactoryMenuItemProvider>;

export const getEmbeddableFactoryMenuItemProvider =
  (api: PresentationContainer, closePopover: () => void) => (factory: EmbeddableFactory) => {
    const icon = factory?.getIconType ? factory.getIconType() : 'empty';

    const toolTipContent = factory?.getDescription ? factory.getDescription() : undefined;

    return {
      name: factory.getDisplayName(),
      icon,
      toolTipContent,
      onClick: async () => {
        closePopover();
        api.addNewPanel({ panelType: factory.type }, true);
      },
      'data-test-subj': `createNew-${factory.type}`,
    };
  };

export const mergeGroupedItemsProvider =
  (getEmbeddableFactoryMenuItem: GetEmbeddableFactoryMenuItem) =>
  (
    factoryGroupMap: Record<string, FactoryGroup>,
    groupedAddPanelAction: Record<string, GroupedAddPanelActions>
  ): [EuiContextMenuPanelItemDescriptor[], EuiContextMenuPanelDescriptor[]] => {
    const initialPanelGroups: EuiContextMenuPanelItemDescriptor[] = [];
    const additionalPanels: EuiContextMenuPanelDescriptor[] = [];

    new Set(Object.keys(factoryGroupMap).concat(Object.keys(groupedAddPanelAction))).forEach(
      (groupId) => {
        const dataTestSubj = `dashboardEditorMenu-${groupId}Group`;

        const factoryGroup = factoryGroupMap[groupId];
        const addPanelGroup = groupedAddPanelAction[groupId];

        if (factoryGroup && addPanelGroup) {
          const panelId = factoryGroup.panelId;

          // TODO: remove this
          initialPanelGroups.push({
            'data-test-subj': dataTestSubj,
            name: factoryGroup.appName,
            icon: factoryGroup.icon,
            panel: panelId,
          });

          additionalPanels.push({
            id: factoryGroup.id,
            title: factoryGroup.appName,
            items: [
              ...factoryGroup.factories.map(getEmbeddableFactoryMenuItem),
              ...(addPanelGroup?.items ?? []),
            ],
          });
        } else if (factoryGroup) {
          const panelId = factoryGroup.panelId;

          initialPanelGroups.push({
            'data-test-subj': dataTestSubj,
            name: factoryGroup.appName,
            icon: factoryGroup.icon,
            panel: panelId,
          });

          additionalPanels.push({
            id: factoryGroup.id,
            title: factoryGroup.appName,
            items: factoryGroup.factories.map(getEmbeddableFactoryMenuItem),
          });
        } else if (addPanelGroup) {
          const panelId = addPanelGroup.id;

          // TODO: remove this
          initialPanelGroups.push({
            'data-test-subj': dataTestSubj,
            name: addPanelGroup.title,
            icon: addPanelGroup.icon,
            panel: panelId,
          });

          additionalPanels.push({
            id: panelId,
            title: addPanelGroup.title,
            items: addPanelGroup.items,
          });
        }
      }
    );

    return [initialPanelGroups, additionalPanels];
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
  const ungroupedFactories: EmbeddableFactory[] = [];
  const aggBasedPanelID = 1;

  let panelCount = 1 + aggBasedPanelID;

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
    };
  }, []);

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
            icon: (group.getIconType
              ? group.getIconType({ embeddable })
              : 'empty') as EuiContextMenuItemIcon,
            factories: [factory],
            panelId: panelCount,
          };

          panelCount++;
        }
      });
    } else {
      ungroupedFactories.push(factory);
    }
  });

  const getVisTypeMenuItem = (visType: BaseVisType): EuiContextMenuPanelItemDescriptor => {
    const { name, title, titleInWizard, description, icon = 'empty', isDeprecated } = visType;
    return {
      name: !isDeprecated ? (
        titleInWizard || title
      ) : (
        <EuiFlexGroup wrap responsive={false} gutterSize="s">
          <EuiFlexItem grow={false}>{titleInWizard || title}</EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning">
              {i18n.translate('dashboard.editorMenu.deprecatedTag', {
                defaultMessage: 'Deprecated',
              })}
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
      icon: icon as string,
      onClick: createNewVisType(visType),
      'data-test-subj': `visType-${name}`,
      toolTipContent: description,
    };
  };

  const getVisTypeAliasMenuItem = (
    visTypeAlias: VisTypeAlias
  ): EuiContextMenuPanelItemDescriptor => {
    const { name, title, description, icon = 'empty' } = visTypeAlias;

    return {
      name: title,
      icon,
      onClick: createNewVisType(visTypeAlias),
      'data-test-subj': `visType-${name}`,
      toolTipContent: description,
    };
  };

  const getEditorMenuPanels = (closePopover: () => void): EuiContextMenuPanelDescriptor[] => {
    const getEmbeddableFactoryMenuItem = getEmbeddableFactoryMenuItemProvider(api, closePopover);

    const groupedAddPanelAction = getAddPanelActionMenuItemsGroup(
      api,
      addPanelActions,
      closePopover
    );

    const [, additionalPanels] = mergeGroupedItemsProvider(getEmbeddableFactoryMenuItem)(
      factoryGroupMap,
      groupedAddPanelAction
    );

    const enhancedPanelGroup = additionalPanels.map((panelGroup) => {
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

    return enhancedPanelGroup;
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

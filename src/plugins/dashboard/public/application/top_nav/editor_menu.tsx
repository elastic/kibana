/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiContextMenu,
  EuiContextMenuPanelItemDescriptor,
  EuiContextMenuItemIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiBadge,
} from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { i18n } from '@kbn/i18n';
import { type BaseVisType, VisGroups, type VisTypeAlias } from '@kbn/visualizations-plugin/public';
import { SolutionToolbarPopover } from '@kbn/presentation-util-plugin/public';
import type {
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  EmbeddableInput,
} from '@kbn/embeddable-plugin/public';

import { DashboardContainer } from '..';
import { DashboardConstants } from '../../dashboard_constants';
import { dashboardReplacePanelAction } from '../../dashboard_strings';
import { pluginServices } from '../../services/plugin_services';

interface Props {
  /** Dashboard container */
  dashboardContainer: DashboardContainer;
  /** Handler for creating new visualization of a specified type */
  createNewVisType: (visType: BaseVisType | VisTypeAlias) => () => void;
}

interface FactoryGroup {
  id: string;
  appName: string;
  icon: EuiContextMenuItemIcon;
  panelId: number;
  factories: EmbeddableFactoryDefinition[];
}

interface UnwrappedEmbeddableFactory {
  factory: EmbeddableFactory;
  isEditable: boolean;
}

export const EditorMenu = ({ dashboardContainer, createNewVisType }: Props) => {
  const {
    embeddable,
    notifications: { toasts },
    settings: { uiSettings },
    usageCollection,
    visualizations: {
      getAliases: getVisTypeAliases,
      getByGroup: getVisTypesByGroup,
      showNewVisModal,
    },
  } = pluginServices.getServices();

  const embeddableFactories = useMemo(
    () => Array.from(embeddable.getEmbeddableFactories()),
    [embeddable]
  );
  const [unwrappedEmbeddableFactories, setUnwrappedEmbeddableFactories] = useState<
    UnwrappedEmbeddableFactory[]
  >([]);

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

  const LABS_ENABLED = uiSettings.get('visualize:enableLabs');

  const trackUiMetric = usageCollection.reportUiCounter?.bind(
    usageCollection,
    DashboardConstants.DASHBOARD_ID
  );

  const createNewAggsBasedVis = useCallback(
    (visType?: BaseVisType) => () =>
      showNewVisModal({
        originatingApp: DashboardConstants.DASHBOARDS_ID,
        outsideVisualizeApp: true,
        showAggsSelection: true,
        selectedVisType: visType,
      }),
    [showNewVisModal]
  );

  const getSortedVisTypesByGroup = (group: VisGroups) =>
    getVisTypesByGroup(group)
      .sort(({ name: a }: BaseVisType | VisTypeAlias, { name: b }: BaseVisType | VisTypeAlias) => {
        if (a < b) {
          return -1;
        }
        if (a > b) {
          return 1;
        }
        return 0;
      })
      .filter(
        ({ hidden, stage }: BaseVisType) => !(hidden || (!LABS_ENABLED && stage === 'experimental'))
      );

  const promotedVisTypes = getSortedVisTypesByGroup(VisGroups.PROMOTED);
  const aggsBasedVisTypes = getSortedVisTypesByGroup(VisGroups.AGGBASED);
  const toolVisTypes = getSortedVisTypesByGroup(VisGroups.TOOLS);
  const visTypeAliases = getVisTypeAliases().sort(
    ({ promotion: a = false }: VisTypeAlias, { promotion: b = false }: VisTypeAlias) =>
      a === b ? 0 : a ? -1 : 1
  );

  const factories = unwrappedEmbeddableFactories.filter(
    ({ isEditable, factory: { type, canCreateNew, isContainerType } }) =>
      isEditable && !isContainerType && canCreateNew() && type !== 'visualization'
  );

  const factoryGroupMap: Record<string, FactoryGroup> = {};
  const ungroupedFactories: EmbeddableFactoryDefinition[] = [];
  const aggBasedPanelID = 1;

  let panelCount = 1 + aggBasedPanelID;

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
    const {
      name,
      title,
      titleInWizard,
      description,
      icon = 'empty',
      group,
      isDeprecated,
    } = visType;
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
      onClick:
        // not all the agg-based visualizations need to be created via the wizard
        group === VisGroups.AGGBASED && visType.options.showIndexSelection
          ? createNewAggsBasedVis(visType)
          : createNewVisType(visType),
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

  const getEmbeddableFactoryMenuItem = (
    factory: EmbeddableFactoryDefinition,
    closePopover: () => void
  ): EuiContextMenuPanelItemDescriptor => {
    const icon = factory?.getIconType ? factory.getIconType() : 'empty';

    const toolTipContent = factory?.getDescription ? factory.getDescription() : undefined;

    return {
      name: factory.getDisplayName(),
      icon,
      toolTipContent,
      onClick: async () => {
        closePopover();
        if (trackUiMetric) {
          trackUiMetric(METRIC_TYPE.CLICK, factory.type);
        }
        let newEmbeddable;
        if (factory.getExplicitInput) {
          const explicitInput = await factory.getExplicitInput();
          newEmbeddable = await dashboardContainer.addNewEmbeddable(factory.type, explicitInput);
        } else {
          newEmbeddable = await factory.create({} as EmbeddableInput, dashboardContainer);
        }

        if (newEmbeddable) {
          toasts.addSuccess({
            title: dashboardReplacePanelAction.getSuccessMessage(
              `'${newEmbeddable.getInput().title}'` || ''
            ),
            'data-test-subj': 'addEmbeddableToDashboardSuccess',
          });
        }
      },
      'data-test-subj': `createNew-${factory.type}`,
    };
  };

  const aggsPanelTitle = i18n.translate('dashboard.editorMenu.aggBasedGroupTitle', {
    defaultMessage: 'Aggregation based',
  });

  const getEditorMenuPanels = (closePopover: () => void) => {
    return [
      {
        id: 0,
        items: [
          ...visTypeAliases.map(getVisTypeAliasMenuItem),
          ...Object.values(factoryGroupMap).map(({ id, appName, icon, panelId }) => ({
            name: appName,
            icon,
            panel: panelId,
            'data-test-subj': `dashboardEditorMenu-${id}Group`,
          })),
          ...ungroupedFactories.map((factory) => {
            return getEmbeddableFactoryMenuItem(factory, closePopover);
          }),
          ...promotedVisTypes.map(getVisTypeMenuItem),
          {
            name: aggsPanelTitle,
            icon: 'visualizeApp',
            panel: aggBasedPanelID,
            'data-test-subj': `dashboardEditorAggBasedMenuItem`,
          },
          ...toolVisTypes.map(getVisTypeMenuItem),
        ],
      },
      {
        id: aggBasedPanelID,
        title: aggsPanelTitle,
        items: aggsBasedVisTypes.map(getVisTypeMenuItem),
      },
      ...Object.values(factoryGroupMap).map(
        ({ appName, panelId, factories: groupFactories }: FactoryGroup) => ({
          id: panelId,
          title: appName,
          items: groupFactories.map((factory) => {
            return getEmbeddableFactoryMenuItem(factory, closePopover);
          }),
        })
      ),
    ];
  };
  return (
    <SolutionToolbarPopover
      ownFocus
      label={i18n.translate('dashboard.solutionToolbar.editorMenuButtonLabel', {
        defaultMessage: 'Select type',
      })}
      iconType="arrowDown"
      iconSide="right"
      panelPaddingSize="none"
      data-test-subj="dashboardEditorMenuButton"
    >
      {({ closePopover }: { closePopover: () => void }) => (
        <EuiContextMenu
          initialPanelId={0}
          panels={getEditorMenuPanels(closePopover)}
          className={`dshSolutionToolbar__editorContextMenu`}
          data-test-subj="dashboardEditorContextMenu"
        />
      )}
    </SolutionToolbarPopover>
  );
};

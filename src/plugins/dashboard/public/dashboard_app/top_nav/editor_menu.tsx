/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import './editor_menu.scss';

import React, { useEffect, useCallback, type ComponentProps } from 'react';

import { i18n } from '@kbn/i18n';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { ToolbarButton } from '@kbn/shared-ux-button-toolbar';

import { useGetDashboardPanels, DashboardPanelSelectionListFlyout } from './add_new_panel';
import { useDashboardApi } from '../../dashboard_api/use_dashboard_api';
import { coreServices } from '../../services/kibana_services';

interface EditorMenuProps
  extends Pick<Parameters<typeof useGetDashboardPanels>[0], 'createNewVisType'> {
  isDisabled?: boolean;
}

export const EditorMenu = ({ createNewVisType, isDisabled }: EditorMenuProps) => {
  const dashboardApi = useDashboardApi();

<<<<<<< HEAD
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
=======
  const fetchDashboardPanels = useGetDashboardPanels({
    api: dashboardApi,
    createNewVisType,
>>>>>>> upstream/main
  });

  useEffect(() => {
    // ensure opened dashboard is closed if a navigation event happens;
    return () => {
      dashboardApi.clearOverlays();
    };
  }, [dashboardApi]);

  const openDashboardPanelSelectionFlyout = useCallback(
    function openDashboardPanelSelectionFlyout() {
      const flyoutPanelPaddingSize: ComponentProps<
        typeof DashboardPanelSelectionListFlyout
      >['paddingSize'] = 'l';

      const mount = toMountPoint(
        React.createElement(function () {
          return (
            <DashboardPanelSelectionListFlyout
              close={dashboardApi.clearOverlays}
              {...{
                paddingSize: flyoutPanelPaddingSize,
                fetchDashboardPanels: fetchDashboardPanels.bind(null, dashboardApi.clearOverlays),
              }}
            />
          );
        }),
        { analytics: coreServices.analytics, theme: coreServices.theme, i18n: coreServices.i18n }
      );

<<<<<<< HEAD
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
        default: {
          return {
            ...panelGroup,
            items: sortGroupPanelsByOrder(panelGroup.items),
          };
        }
      }
    });
  };
=======
      dashboardApi.openOverlay(
        coreServices.overlays.openFlyout(mount, {
          size: 'm',
          maxWidth: 500,
          paddingSize: flyoutPanelPaddingSize,
          'aria-labelledby': 'addPanelsFlyout',
          'data-test-subj': 'dashboardPanelSelectionFlyout',
          onClose(overlayRef) {
            dashboardApi.clearOverlays();
            overlayRef.close();
          },
        })
      );
    },
    [dashboardApi, fetchDashboardPanels]
  );
>>>>>>> upstream/main

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

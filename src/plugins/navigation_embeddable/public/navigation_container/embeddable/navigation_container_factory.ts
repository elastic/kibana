/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import {
  ACTION_ADD_PANEL,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
} from '@kbn/embeddable-plugin/public';
import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { NavigationContainerInput } from '../types';
import { NAVIGATION_EMBEDDABLE_TYPE } from './navigation_container';
import { coreServices, untilPluginStartServicesReady } from '../../services/kibana_services';

export type NavigationEmbeddableFactory = EmbeddableFactory;

const getDefaultNavigationContainerInput = (): Omit<NavigationContainerInput, 'id'> => ({
  panels: {},
  disabledActions: [ACTION_ADD_PANEL, 'OPEN_FLYOUT_ADD_DRILLDOWN'],
});

export class NavigationEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<NavigationContainerInput>
{
  public readonly type = NAVIGATION_EMBEDDABLE_TYPE;

  public isContainerType = false;

  public async isEditable() {
    await untilPluginStartServicesReady();
    return Boolean(coreServices.application.capabilities.dashboard?.showWriteControls);
  }

  public canCreateNew() {
    return true;
  }

  public getDefaultInput(): Partial<NavigationContainerInput> {
    return getDefaultNavigationContainerInput();
  }

  public async create(initialInput: NavigationContainerInput, parent: DashboardContainer) {
    await untilPluginStartServicesReady();
    const reduxEmbeddablePackage = await lazyLoadReduxToolsPackage();
    const { NavigationContainer } = await import('./navigation_container');

    /**
     * TODO: What are our conditions to ensure this embeddable is editable?
     * Example from Lens:
     *   private getIsEditable() {
     *      return (
     *        this.deps.capabilities.canSaveVisualizations ||
     *        (!this.inputIsRefType(this.getInput()) &&
     *          this.deps.capabilities.canSaveDashboards &&
     *          this.deps.capabilities.canOpenVisualizations)
     *      );
     *   }
     */
    return new NavigationContainer(
      reduxEmbeddablePackage,
      // { editable: true },
      { ...getDefaultNavigationContainerInput(), ...initialInput },
      parent
    );
  }

  public async getExplicitInput(
    initialInput?: NavigationContainerInput,
    parent?: DashboardContainer
  ) {
    if (!parent) return {};

    const { openCreateNewFlyout: createNavigationContainer } = await import(
      '../editor/open_create_new_flyout'
    );

    const input = await createNavigationContainer(
      { ...getDefaultNavigationContainerInput(), ...initialInput },
      parent.getState().componentState.lastSavedId
    );

    return input;
  }

  public getDisplayName() {
    return i18n.translate('navigationEmbeddable.navigationEmbeddableFactory.displayName', {
      defaultMessage: 'Links',
    });
  }

  public getIconType() {
    return 'link';
  }
}

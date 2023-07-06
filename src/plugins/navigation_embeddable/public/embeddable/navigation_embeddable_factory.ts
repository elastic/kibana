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

import { NavigationEmbeddableInput } from './types';
import { NAVIGATION_EMBEDDABLE_TYPE } from './navigation_embeddable';
import { coreServices, untilPluginStartServicesReady } from '../services/kibana_services';

export type NavigationEmbeddableFactory = EmbeddableFactory;

const getDefaultNavigationEmbeddableInput = (): Omit<NavigationEmbeddableInput, 'id'> => ({
  links: {},
  disabledActions: [ACTION_ADD_PANEL, 'OPEN_FLYOUT_ADD_DRILLDOWN'],
});

export class NavigationEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<NavigationEmbeddableInput>
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

  public getDefaultInput(): Partial<NavigationEmbeddableInput> {
    return getDefaultNavigationEmbeddableInput();
  }

  public async create(initialInput: NavigationEmbeddableInput, parent: DashboardContainer) {
    await untilPluginStartServicesReady();
    const reduxEmbeddablePackage = await lazyLoadReduxToolsPackage();
    const { NavigationEmbeddable } = await import('./navigation_embeddable');

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
    return new NavigationEmbeddable(
      reduxEmbeddablePackage,
      // { editable: true },
      { ...getDefaultNavigationEmbeddableInput(), ...initialInput },
      parent
    );
  }

  public async getExplicitInput(
    initialInput?: NavigationEmbeddableInput,
    parent?: DashboardContainer
  ) {
    if (!parent) return {};

    const { openCreateNewFlyout: createNavigationEmbeddable } = await import(
      '../editor/open_create_new_flyout'
    );

    const input = await createNavigationEmbeddable(
      { ...getDefaultNavigationEmbeddableInput(), ...initialInput },
      parent
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

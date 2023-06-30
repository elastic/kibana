/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import {
  ACTION_ADD_PANEL,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
} from '@kbn/embeddable-plugin/public';

import { NAVIGATION_EMBEDDABLE_TYPE } from './navigation_container';
import { coreServices, untilPluginStartServicesReady } from '../../services/kibana_services';
import { NavigationContainerInput } from '../../types';

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

  public async getExplicitInput(initialInput: NavigationContainerInput) {
    console.log('here');
    return { ...getDefaultNavigationContainerInput(), ...initialInput };
    // const { configureImage } = await import('../image_editor');
    // const start = this.deps.start();
    // const { files, overlays, theme, application, externalUrl, getUser } = start;
    // const user = await getUser();
    // const imageConfig = await configureImage(
    //   {
    //     files,
    //     overlays,
    //     theme,
    //     user,
    //     currentAppId$: application.currentAppId$,
    //     validateUrl: createValidateUrl(externalUrl),
    //     getImageDownloadHref: this.getImageDownloadHref,
    //   },
    //   initialInput ? initialInput.imageConfig : undefined
    // );
    // return { imageConfig };
  }

  public getDisplayName() {
    return i18n.translate('navigationEmbeddable.navigationEmbeddableFactory.displayName', {
      defaultMessage: 'Navigation',
    });
  }

  public getIconType() {
    return 'link';
  }
}

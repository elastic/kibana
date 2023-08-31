/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  ErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { NavigationEmbeddableByReferenceInput, NavigationEmbeddableInput } from './types';
import { APP_ICON, APP_NAME, CONTENT_ID } from '../../common';
import type { NavigationEmbeddable } from './navigation_embeddable';
import { getNavigationEmbeddableAttributeService } from '../services/attribute_service';
import { coreServices, untilPluginStartServicesReady } from '../services/kibana_services';
import { extract, inject } from '../../common/embeddable';

export type NavigationEmbeddableFactory = EmbeddableFactory;

// TODO: Replace string 'OPEN_FLYOUT_ADD_DRILLDOWN' with constant once the dashboardEnhanced plugin is removed
// and it is no longer locked behind `x-pack`
const getDefaultNavigationEmbeddableInput = (): Partial<NavigationEmbeddableInput> => ({
  disabledActions: ['OPEN_FLYOUT_ADD_DRILLDOWN'],
});

export class NavigationEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<NavigationEmbeddableInput>
{
  public readonly type = CONTENT_ID;

  public readonly isContainerType = false;

  public readonly savedObjectMetaData = {
    name: APP_NAME,
    type: CONTENT_ID,
    getIconForSavedObject: () => APP_ICON,
  };

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

  public async createFromSavedObject(
    savedObjectId: string,
    input: NavigationEmbeddableInput,
    parent: DashboardContainer
  ): Promise<NavigationEmbeddable | ErrorEmbeddable> {
    if (!(input as NavigationEmbeddableByReferenceInput).savedObjectId) {
      (input as NavigationEmbeddableByReferenceInput).savedObjectId = savedObjectId;
    }
    return this.create(input, parent);
  }

  public async create(initialInput: NavigationEmbeddableInput, parent: DashboardContainer) {
    await untilPluginStartServicesReady();

    const reduxEmbeddablePackage = await lazyLoadReduxToolsPackage();
    const { NavigationEmbeddable } = await import('./navigation_embeddable');
    const editable = await this.isEditable();

    return new NavigationEmbeddable(
      reduxEmbeddablePackage,
      { editable },
      { ...getDefaultNavigationEmbeddableInput(), ...initialInput },
      getNavigationEmbeddableAttributeService(),
      parent
    );
  }

  public async getExplicitInput(
    initialInput: NavigationEmbeddableInput,
    parent?: DashboardContainer
  ): Promise<Omit<NavigationEmbeddableInput, 'id'>> {
    if (!parent) return {};

    const { openEditorFlyout } = await import('../editor/open_editor_flyout');

    const input = await openEditorFlyout(
      {
        ...getDefaultNavigationEmbeddableInput(),
        ...initialInput,
      },
      parent
    );

    return input;
  }

  public getDisplayName() {
    return APP_NAME;
  }

  public getIconType() {
    return 'link';
  }

  inject = inject;

  extract = extract;
}

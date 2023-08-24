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
  EmbeddablePackageState,
  ErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import {
  NavigationEmbeddableByValueInput,
  NavigationEmbeddableByReferenceInput,
  NavigationEmbeddableInput,
} from './types';
import { APP_ICON, APP_NAME, CONTENT_ID } from '../../common';
import type { NavigationEmbeddable } from './navigation_embeddable';
import { NAV_VERTICAL_LAYOUT } from '../../common/content_management';
import { getNavigationEmbeddableAttributeService } from '../services/attribute_service';
import { coreServices, untilPluginStartServicesReady } from '../services/kibana_services';

export type NavigationEmbeddableFactory = EmbeddableFactory;

export interface NavigationEmbeddableCreationOptions {
  getInitialInput?: () => Partial<NavigationEmbeddableInput>;
  getIncomingEmbeddable?: () => EmbeddablePackageState | undefined;
}

// TODO: Replace string 'OPEN_FLYOUT_ADD_DRILLDOWN' with constant once the dashboardEnhanced plugin is removed
// and it is no longer locked behind `x-pack`
const getDefaultNavigationEmbeddableInput = (): Omit<NavigationEmbeddableByValueInput, 'id'> => ({
  attributes: {
    title: '',
    layout: NAV_VERTICAL_LAYOUT,
  },
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

  // TODO create<Inject|Extract> functions
  // public inject: EmbeddablePersistableStateService['inject'];
  // public extract: EmbeddablePersistableStateService['extract'];

  constructor(persistableStateService: EmbeddablePersistableStateService) {
    // this.inject = createInject(this.persistableStateService);
    // this.extract = createExtract(this.persistableStateService);
  }

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
}

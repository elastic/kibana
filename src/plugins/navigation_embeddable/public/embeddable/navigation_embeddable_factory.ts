/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  ACTION_ADD_PANEL,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  EmbeddablePackageState,
  ErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';
import {
  NavigationEmbeddableByReferenceInput,
  NavigationEmbeddableByValueInput,
  NavigationEmbeddableInput,
} from './types';
import type { NavigationEmbeddable } from './navigation_embeddable';
import { coreServices, untilPluginStartServicesReady } from '../services/kibana_services';
import { getNavigationEmbeddableAttributeService } from '../services/attribute_service';
import { APP_ICON, APP_NAME, CONTENT_ID, NAVIGATION_EMBEDDABLE_TYPE } from '../../common/constants';

export type NavigationEmbeddableFactory = EmbeddableFactory;

export interface NavigationEmbeddableCreationOptions {
  getInitialInput?: () => Partial<NavigationEmbeddableInput>;
  getIncomingEmbeddable?: () => EmbeddablePackageState | undefined;
}

// TODO: Replace string 'OPEN_FLYOUT_ADD_DRILLDOWN' with constant as part of https://github.com/elastic/kibana/issues/154381
const getDefaultNavigationEmbeddableInput = (): Omit<NavigationEmbeddableInput, 'id'> => ({
  disabledActions: [ACTION_ADD_PANEL, 'OPEN_FLYOUT_ADD_DRILLDOWN'],
});

export class NavigationEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<NavigationEmbeddableInput>
{
  public readonly type = NAVIGATION_EMBEDDABLE_TYPE;

  public readonly isContainerType = false;

  public readonly savedObjectMetaData = {
    name: APP_NAME,
    type: CONTENT_ID,
    getIconForSavedObject: () => APP_ICON,
  };

  // TODO create<Inject|Extract> functions
  // public inject: EmbeddablePersistableStateService['inject'];
  // public extract: EmbeddablePersistableStateService['extract'];

  constructor(private readonly persistableStateService: EmbeddablePersistableStateService) {
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
      await getNavigationEmbeddableAttributeService(),
      parent
    );
  }

  public async getExplicitInput(
    initialInput?: NavigationEmbeddableInput,
    parent?: DashboardContainer
  ): Promise<Omit<NavigationEmbeddableInput, 'id'>> {
    if (!parent) return {};

    const { openEditorFlyout } = await import('../editor/open_editor_flyout');

    const input = await openEditorFlyout(
      {
        ...getDefaultNavigationEmbeddableInput(),
        ...initialInput,
      } as NavigationEmbeddableByValueInput,
      parent
    ).catch(() => {
      // swallow the promise rejection that happens when the flyout is closed
      return {};
    });

    return input;
  }

  public getDisplayName() {
    return APP_NAME;
  }

  public getIconType() {
    return 'link';
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEmpty } from 'lodash';

import { i18n } from '@kbn/i18n';
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
import { NavigationEmbeddableInput } from '../../common';
import type { NavigationEmbeddable } from './navigation_embeddable';
import { NAVIGATION_EMBEDDABLE_TYPE } from './navigation_embeddable';
import { coreServices, untilPluginStartServicesReady } from '../services/kibana_services';
import { navigationEmbeddableClient } from '../content_management';

export type NavigationEmbeddableFactory = EmbeddableFactory;

export interface NavigationEmbeddableCreationOptions {
  getInitialInput?: () => Partial<NavigationEmbeddableInput>;
  getIncomingEmbeddable?: () => EmbeddablePackageState | undefined;
}

// TODO: Replace string 'OPEN_FLYOUT_ADD_DRILLDOWN' with constant as part of https://github.com/elastic/kibana/issues/154381
const getDefaultNavigationEmbeddableInput = (): Omit<NavigationEmbeddableInput, 'id'> => ({
  links: {},
  disabledActions: [ACTION_ADD_PANEL, 'OPEN_FLYOUT_ADD_DRILLDOWN'],
});

export class NavigationEmbeddableFactoryDefinition
  implements EmbeddableFactoryDefinition<NavigationEmbeddableInput>
{
  public readonly type = NAVIGATION_EMBEDDABLE_TYPE;

  public isContainerType = false;

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
    input: Partial<NavigationEmbeddableInput>,
    parent: DashboardContainer
  ): Promise<NavigationEmbeddable | ErrorEmbeddable> {
    try {
      const { navigationEmbeddableFound, navigationEmbeddableInput } =
        await navigationEmbeddableClient.loadNavigationEmbeddableState({
          id: savedObjectId,
        });
      if (!navigationEmbeddableFound || navigationEmbeddableInput === undefined)
        throw new Error(`Unable to load saved object with id: ${savedObjectId}`);
      return this.createEmbeddable(navigationEmbeddableInput, parent);
    } catch (e) {
      return new ErrorEmbeddable(e, { id: savedObjectId }, parent);
    }
  }

  public async create(initialInput: NavigationEmbeddableInput, parent: DashboardContainer) {
    if (!initialInput.links || isEmpty(initialInput.links)) {
      // don't create an empty navigation embeddable - it should always have at least one link
      return;
    }
    return this.createEmbeddable(initialInput, parent);
  }

  public async getExplicitInput(
    initialInput?: NavigationEmbeddableInput,
    parent?: DashboardContainer
  ) {
    if (!parent) return {};

    const { openEditorFlyout: createNavigationEmbeddable } = await import(
      '../editor/open_editor_flyout'
    );

    const input = await createNavigationEmbeddable(
      { ...getDefaultNavigationEmbeddableInput(), ...initialInput },
      parent
    ).catch(() => {
      // swallow the promise rejection that happens when the flyout is closed
      return {};
    });

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

  private async createEmbeddable(
    initialInput: NavigationEmbeddableInput,
    parent: DashboardContainer
  ) {
    await untilPluginStartServicesReady();

    const reduxEmbeddablePackage = await lazyLoadReduxToolsPackage();
    const { NavigationEmbeddable } = await import('./navigation_embeddable');
    const editable = await this.isEditable();

    return new NavigationEmbeddable(
      reduxEmbeddablePackage,
      { editable },
      { ...getDefaultNavigationEmbeddableInput(), ...initialInput },
      parent
    );
  }
}

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
} from '@kbn/embeddable-plugin/public';
import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';

import { NAVIGATION_EMBEDDABLE_TYPE } from './navigation_embeddable';
import { NavigationEmbeddableInput, NAV_VERTICAL_LAYOUT } from './types';
import { coreServices, untilPluginStartServicesReady } from '../services/kibana_services';

export type NavigationEmbeddableFactory = EmbeddableFactory;

// TODO: Replace string 'OPEN_FLYOUT_ADD_DRILLDOWN' with constant as part of https://github.com/elastic/kibana/issues/154381
const getDefaultNavigationEmbeddableInput = (): Omit<NavigationEmbeddableInput, 'id'> => ({
  links: {},
  layout: NAV_VERTICAL_LAYOUT,
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
    if (!initialInput.links || isEmpty(initialInput.links)) {
      // don't create an empty navigation embeddable - it should always have at least one link
      return;
    }

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

  public async getExplicitInput(
    initialInput?: NavigationEmbeddableInput,
    parent?: DashboardContainer
  ) {
    if (!parent) return {};

    const { openEditorFlyout } = await import('../editor/open_editor_flyout');

    const input = await openEditorFlyout(
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
}

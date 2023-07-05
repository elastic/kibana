/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EmbeddableFactoryDefinition } from '@kbn/embeddable-plugin/public';
import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';

import { DashboardLinkInput } from '../types';
import { ILinkFactory } from '../../types';
import { NavigationContainer } from '../../navigation_container/embeddable/navigation_container';
import { DashboardLinkEditorDestinationPicker } from '../components/dashboard_link_editor_destination_picker';

export const DASHBOARD_LINK_EMBEDDABLE_TYPE = 'navEmbeddable_dashboardLink';

export class DashboardLinkFactory
  implements EmbeddableFactoryDefinition, ILinkFactory<DashboardLinkInput>
{
  constructor() {}

  public type = DASHBOARD_LINK_EMBEDDABLE_TYPE;

  public async isEditable() {
    return true;
  }

  public canCreateNew() {
    return false;
  }

  public linkEditorDestinationComponent = DashboardLinkEditorDestinationPicker;

  public async create(initialInput: DashboardLinkInput, parent: NavigationContainer) {
    const { DashboardLinkEmbeddable } = await import('./dashboard_link_embeddable');
    const reduxEmbeddablePackage = await lazyLoadReduxToolsPackage();

    return Promise.resolve(
      new DashboardLinkEmbeddable(reduxEmbeddablePackage, initialInput, parent)
    );
  }

  public getDisplayName() {
    return i18n.translate('navigationEmbeddable.navigationEmbeddableFactory.displayName', {
      defaultMessage: 'Dashboard',
    });
  }

  public getIconType() {
    return 'dashboardApp';
  }
}

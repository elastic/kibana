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

import { IProvidesPanelPlacementSettings } from '@kbn/dashboard-plugin/public/dashboard_container/component/panel_placement/types';
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import {
  MigrateFunctionsObject,
  GetMigrationFunctionObjectFn,
} from '@kbn/kibana-utils-plugin/common';
import { UiActionsPresentableGrouping } from '@kbn/ui-actions-plugin/public';
import { DASHBOARD_GRID_COLUMN_COUNT } from '@kbn/dashboard-plugin/public';
import {
  NavigationEmbeddableInput,
  NavigationEmbeddableByReferenceInput,
  NavigationEmbeddableEditorFlyoutReturn,
} from './types';
import { extract, inject } from '../../common/embeddable';
import { APP_ICON, APP_NAME, CONTENT_ID } from '../../common';
import type { NavigationEmbeddable } from './navigation_embeddable';
import { NavigationEmbeddableAttributes } from '../../common/content_management';
import { NavEmbeddableStrings } from '../components/navigation_embeddable_strings';
import { getNavigationEmbeddableAttributeService } from '../services/attribute_service';
import { coreServices, untilPluginStartServicesReady } from '../services/kibana_services';

export type NavigationEmbeddableFactory = EmbeddableFactory;

// TODO: Replace string 'OPEN_FLYOUT_ADD_DRILLDOWN' with constant once the dashboardEnhanced plugin is removed
// and it is no longer locked behind `x-pack`
const getDefaultNavigationEmbeddableInput = (): Partial<NavigationEmbeddableInput> => ({
  disabledActions: ['OPEN_FLYOUT_ADD_DRILLDOWN'],
});

const isNavigationEmbeddableAttributes = (
  attributes?: unknown
): attributes is NavigationEmbeddableAttributes => {
  return (
    attributes !== undefined &&
    Boolean(
      (attributes as NavigationEmbeddableAttributes).layout ||
        (attributes as NavigationEmbeddableAttributes).links
    )
  );
};

export class NavigationEmbeddableFactoryDefinition
  implements
    EmbeddableFactoryDefinition<NavigationEmbeddableInput>,
    IProvidesPanelPlacementSettings<NavigationEmbeddableInput>
{
  latestVersion?: string | undefined;
  telemetry?:
    | ((state: EmbeddableStateWithType, stats: Record<string, any>) => Record<string, any>)
    | undefined;
  migrations?: MigrateFunctionsObject | GetMigrationFunctionObjectFn | undefined;
  grouping?: UiActionsPresentableGrouping<unknown> | undefined;
  public readonly type = CONTENT_ID;

  public readonly isContainerType = false;

  public readonly savedObjectMetaData = {
    name: APP_NAME,
    type: CONTENT_ID,
    getIconForSavedObject: () => APP_ICON,
  };

  public getPanelPlacementSettings: IProvidesPanelPlacementSettings<
    NavigationEmbeddableInput,
    NavigationEmbeddableAttributes | unknown
  >['getPanelPlacementSettings'] = (input, attributes) => {
    if (!isNavigationEmbeddableAttributes(attributes) || !attributes.layout) {
      // if we have no information about the layout of this nav embeddable defer to default panel size and placement.
      return {};
    }

    const isHorizontal = attributes.layout === 'horizontal';
    const width = isHorizontal ? DASHBOARD_GRID_COLUMN_COUNT : 8;
    const height = isHorizontal ? 4 : (attributes.links?.length ?? 1 * 3) + 4;
    return { width, height, strategy: 'placeAtTop' };
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
  ): Promise<NavigationEmbeddableEditorFlyoutReturn> {
    if (!parent) return { newInput: {} };

    const { openEditorFlyout } = await import('../editor/open_editor_flyout');

    const { newInput, attributes } = await openEditorFlyout(
      {
        ...getDefaultNavigationEmbeddableInput(),
        ...initialInput,
      },
      parent
    );

    return { newInput, attributes };
  }

  public getDisplayName() {
    return APP_NAME;
  }

  public getIconType() {
    return 'link';
  }

  public getDescription() {
    return NavEmbeddableStrings.getDescription();
  }

  inject = inject;

  extract = extract;
}

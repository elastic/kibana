/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DASHBOARD_GRID_COLUMN_COUNT, PanelPlacementStrategy } from '@kbn/dashboard-plugin/public';
import type { DashboardContainer } from '@kbn/dashboard-plugin/public/dashboard_container';
import { IProvidesLegacyPanelPlacementSettings } from '@kbn/dashboard-plugin/public';
import { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import {
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  ErrorEmbeddable,
  COMMON_EMBEDDABLE_GROUPING,
} from '@kbn/embeddable-plugin/public';
import {
  GetMigrationFunctionObjectFn,
  MigrateFunctionsObject,
} from '@kbn/kibana-utils-plugin/common';
import { UiActionsPresentableGrouping } from '@kbn/ui-actions-plugin/public';

import { APP_ICON, APP_NAME, CONTENT_ID } from '../../common';
import { LinksAttributes } from '../../common/content_management';
import { extract, inject } from '../../common/embeddable';
import { LinksStrings } from '../components/links_strings';
import { getLinksAttributeService } from '../services/attribute_service';
import { coreServices, untilPluginStartServicesReady } from '../services/kibana_services';
import type { LinksEmbeddable } from './links_embeddable';
import { LinksByReferenceInput, LinksEditorFlyoutReturn, LinksInput } from './types';

export type LinksFactory = EmbeddableFactory;

// TODO: Replace string 'OPEN_FLYOUT_ADD_DRILLDOWN' with constant once the dashboardEnhanced plugin is removed
// and it is no longer locked behind `x-pack`
const getDefaultLinksInput = (): Partial<LinksInput> => ({
  disabledActions: ['OPEN_FLYOUT_ADD_DRILLDOWN'],
});

const isLinksAttributes = (attributes?: unknown): attributes is LinksAttributes => {
  return (
    attributes !== undefined &&
    Boolean((attributes as LinksAttributes).layout || (attributes as LinksAttributes).links)
  );
};

export class LinksFactoryDefinition
  implements
    EmbeddableFactoryDefinition<LinksInput>,
    IProvidesLegacyPanelPlacementSettings<LinksInput>
{
  latestVersion?: string | undefined;
  telemetry?:
    | ((state: EmbeddableStateWithType, stats: Record<string, any>) => Record<string, any>)
    | undefined;
  migrations?: MigrateFunctionsObject | GetMigrationFunctionObjectFn | undefined;
  grouping: UiActionsPresentableGrouping<unknown> = [COMMON_EMBEDDABLE_GROUPING.annotation];

  public readonly type = CONTENT_ID;

  public readonly isContainerType = false;

  public readonly savedObjectMetaData = {
    name: APP_NAME,
    type: CONTENT_ID,
    getIconForSavedObject: () => APP_ICON,
  };

  public getLegacyPanelPlacementSettings: IProvidesLegacyPanelPlacementSettings<
    LinksInput,
    LinksAttributes | unknown
  >['getLegacyPanelPlacementSettings'] = (input, attributes) => {
    if (!isLinksAttributes(attributes) || !attributes.layout) {
      // if we have no information about the layout of this links panel defer to default panel size and placement.
      return {};
    }

    const isHorizontal = attributes.layout === 'horizontal';
    const width = isHorizontal ? DASHBOARD_GRID_COLUMN_COUNT : 8;
    const height = isHorizontal ? 4 : (attributes.links?.length ?? 1 * 3) + 4;
    return { width, height, strategy: PanelPlacementStrategy.placeAtTop };
  };

  public async isEditable() {
    await untilPluginStartServicesReady();
    return Boolean(coreServices.application.capabilities.dashboard?.showWriteControls);
  }

  public canCreateNew() {
    return true;
  }

  public getDefaultInput(): Partial<LinksInput> {
    return getDefaultLinksInput();
  }

  public async createFromSavedObject(
    savedObjectId: string,
    input: LinksInput,
    parent: DashboardContainer
  ): Promise<LinksEmbeddable | ErrorEmbeddable> {
    if (!(input as LinksByReferenceInput).savedObjectId) {
      (input as LinksByReferenceInput).savedObjectId = savedObjectId;
    }
    return this.create(input, parent);
  }

  public async create(initialInput: LinksInput, parent: DashboardContainer) {
    await untilPluginStartServicesReady();

    const { LinksEmbeddable } = await import('./links_embeddable');
    const editable = await this.isEditable();

    return new LinksEmbeddable(
      { editable },
      { ...getDefaultLinksInput(), ...initialInput },
      getLinksAttributeService(),
      parent
    );
  }

  public async getExplicitInput(
    initialInput: LinksInput,
    parent?: DashboardContainer
  ): Promise<LinksEditorFlyoutReturn> {
    const { openEditorFlyout } = await import('../editor/open_editor_flyout');

    const { newInput, attributes } = await openEditorFlyout(
      {
        ...getDefaultLinksInput(),
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
    return LinksStrings.getDescription();
  }

  inject = inject;

  extract = extract;
}

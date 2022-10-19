/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { identity, pickBy } from 'lodash';

import {
  ControlGroupContainer,
  ControlGroupInput,
  ControlGroupOutput,
  CONTROL_GROUP_TYPE,
} from '@kbn/controls-plugin/public';
import {
  Container,
  ErrorEmbeddable,
  ContainerOutput,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  isErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';

import { getDefaultControlGroupInput } from '@kbn/controls-plugin/common';
import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';

import { DashboardContainerInput } from '../..';
import { createExtract, createInject } from '../../../common';
import type { DashboardContainer } from './dashboard_container';
import { DASHBOARD_CONTAINER_TYPE } from '../../dashboard_constants';

export type DashboardContainerFactory = EmbeddableFactory<
  DashboardContainerInput,
  ContainerOutput,
  DashboardContainer
>;
export class DashboardContainerFactoryDefinition
  implements
    EmbeddableFactoryDefinition<DashboardContainerInput, ContainerOutput, DashboardContainer>
{
  public readonly isContainerType = true;
  public readonly type = DASHBOARD_CONTAINER_TYPE;

  public inject: EmbeddablePersistableStateService['inject'];
  public extract: EmbeddablePersistableStateService['extract'];

  constructor(private readonly persistableStateService: EmbeddablePersistableStateService) {
    this.inject = createInject(this.persistableStateService);
    this.extract = createExtract(this.persistableStateService);
  }

  public isEditable = async () => {
    // Currently unused for dashboards
    return false;
  };

  public readonly getDisplayName = () => {
    return i18n.translate('dashboard.factory.displayName', {
      defaultMessage: 'Dashboard',
    });
  };

  public getDefaultInput(): Partial<DashboardContainerInput> {
    return {
      panels: {},
      isEmbeddedExternally: false,
      isFullScreenMode: false,
      useMargins: true,
      syncColors: true,
      syncCursor: true,
      syncTooltips: true,
    };
  }

  private buildControlGroup = async (
    initialInput: DashboardContainerInput
  ): Promise<ControlGroupContainer | ErrorEmbeddable | undefined> => {
    const { pluginServices } = await import('../../services/plugin_services');
    const {
      embeddable: { getEmbeddableFactory },
    } = pluginServices.getServices();
    const controlsGroupFactory = getEmbeddableFactory<
      ControlGroupInput,
      ControlGroupOutput,
      ControlGroupContainer
    >(CONTROL_GROUP_TYPE);
    const { filters, query, timeRange, viewMode, controlGroupInput, id } = initialInput;
    const controlGroup = await controlsGroupFactory?.create({
      id: `control_group_${id ?? 'new_dashboard'}`,
      ...getDefaultControlGroupInput(),
      ...pickBy(controlGroupInput, identity), // undefined keys in initialInput should not overwrite defaults
      timeRange,
      viewMode,
      filters,
      query,
    });
    if (controlGroup && !isErrorEmbeddable(controlGroup)) {
      await controlGroup.untilInitialized();
    }
    return controlGroup;
  };

  public create = async (
    initialInput: DashboardContainerInput,
    parent?: Container
  ): Promise<DashboardContainer | ErrorEmbeddable> => {
    const controlGroupPromise = this.buildControlGroup(initialInput);
    const dashboardContainerPromise = import('./dashboard_container');

    const [controlGroup, { DashboardContainer: DashboardContainerEmbeddable }] = await Promise.all([
      controlGroupPromise,
      dashboardContainerPromise,
    ]);

    return Promise.resolve(new DashboardContainerEmbeddable(initialInput, parent, controlGroup));
  };
}

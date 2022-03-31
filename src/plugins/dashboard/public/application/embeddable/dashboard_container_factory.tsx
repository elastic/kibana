/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { EmbeddablePersistableStateService } from 'src/plugins/embeddable/common';

import { identity, pickBy } from 'lodash';
import { DashboardContainerInput } from '../..';
import { DASHBOARD_CONTAINER_TYPE } from './dashboard_constants';
import type { DashboardContainer, DashboardContainerServices } from './dashboard_container';
import {
  Container,
  ErrorEmbeddable,
  ContainerOutput,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
} from '../../services/embeddable';
import {
  createExtract,
  createInject,
} from '../../../common/embeddable/dashboard_container_persistable_state';
import {
  ControlGroupContainer,
  ControlGroupInput,
  ControlGroupOutput,
  CONTROL_GROUP_TYPE,
} from '../../../../controls/public';

import { getDefaultDashboardControlGroupInput } from '../../../common/embeddable/dashboard_control_group';

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

  constructor(
    private readonly getStartServices: () => Promise<DashboardContainerServices>,
    private readonly persistableStateService: EmbeddablePersistableStateService
  ) {
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
    };
  }

  public create = async (
    initialInput: DashboardContainerInput,
    parent?: Container
  ): Promise<DashboardContainer | ErrorEmbeddable> => {
    const services = await this.getStartServices();
    const controlsGroupFactory = services.embeddable.getEmbeddableFactory<
      ControlGroupInput,
      ControlGroupOutput,
      ControlGroupContainer
    >(CONTROL_GROUP_TYPE);
    const { filters, query, timeRange, viewMode, controlGroupInput, id } = initialInput;
    const controlGroup = await controlsGroupFactory?.create({
      id: `control_group_${id ?? 'new_dashboard'}`,
      ...getDefaultDashboardControlGroupInput(),
      ...pickBy(controlGroupInput, identity), // undefined keys in initialInput should not overwrite defaults
      timeRange,
      viewMode,
      filters,
      query,
    });
    const { DashboardContainer: DashboardContainerEmbeddable } = await import(
      './dashboard_container'
    );

    return new DashboardContainerEmbeddable(initialInput, services, parent, controlGroup);
  };
}

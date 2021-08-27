/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { i18n } from '@kbn/i18n';
import type { EmbeddablePersistableStateService } from '../../../../embeddable/common/types';
import { Container } from '../../../../embeddable/public/lib/containers/container';
import type { ContainerOutput } from '../../../../embeddable/public/lib/containers/i_container';
import type { EmbeddableFactory } from '../../../../embeddable/public/lib/embeddables/embeddable_factory';
import type { EmbeddableFactoryDefinition } from '../../../../embeddable/public/lib/embeddables/embeddable_factory_definition';
import { ErrorEmbeddable } from '../../../../embeddable/public/lib/embeddables/error_embeddable';
import {
  createExtract,
  createInject,
} from '../../../common/embeddable/dashboard_container_persistable_state';
import type { DashboardContainerInput } from '../../types';
import { DASHBOARD_CONTAINER_TYPE } from './dashboard_constants';
import type { DashboardContainerServices } from './dashboard_container';
import { DashboardContainer } from './dashboard_container';

export type DashboardContainerFactory = EmbeddableFactory<
  DashboardContainerInput,
  ContainerOutput,
  DashboardContainer
>;
export class DashboardContainerFactoryDefinition
  implements
    EmbeddableFactoryDefinition<DashboardContainerInput, ContainerOutput, DashboardContainer> {
  public readonly isContainerType = true;
  public readonly type = DASHBOARD_CONTAINER_TYPE;

  constructor(
    private readonly getStartServices: () => Promise<DashboardContainerServices>,
    private readonly persistableStateService: EmbeddablePersistableStateService
  ) {}

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
    return new DashboardContainer(initialInput, services, parent);
  };

  public inject = createInject(this.persistableStateService);

  public extract = createExtract(this.persistableStateService);
}

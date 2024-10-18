/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';
import {
  Container,
  ContainerOutput,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  ErrorEmbeddable,
} from '@kbn/embeddable-plugin/public';

import { DASHBOARD_CONTAINER_TYPE } from '..';
import { createExtract, createInject, DashboardContainerInput } from '../../../common';
import { DEFAULT_DASHBOARD_INPUT } from '../../dashboard_constants';
import type { DashboardContainer } from './dashboard_container';
import type { DashboardCreationOptions } from '../..';

export type DashboardContainerFactory = EmbeddableFactory<
  DashboardContainerInput,
  ContainerOutput,
  DashboardContainer
>;

export const dashboardTypeDisplayName = i18n.translate('dashboard.factory.displayName', {
  defaultMessage: 'Dashboard',
});

export const dashboardTypeDisplayLowercase = i18n.translate(
  'dashboard.factory.displayNameLowercase',
  {
    defaultMessage: 'dashboard',
  }
);

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

  public readonly getDisplayName = () => dashboardTypeDisplayName;

  public getDefaultInput(): Partial<DashboardContainerInput> {
    return DEFAULT_DASHBOARD_INPUT;
  }

  public create = async (
    initialInput: DashboardContainerInput,
    parent?: Container,
    creationOptions?: DashboardCreationOptions,
    savedObjectId?: string
  ): Promise<DashboardContainer | ErrorEmbeddable | undefined> => {
    const dashboardCreationStartTime = performance.now();
    const { createDashboard } = await import('./create/create_dashboard');
    try {
      const dashboard = await createDashboard(
        creationOptions,
        dashboardCreationStartTime,
        savedObjectId
      );
      return dashboard;
    } catch (e) {
      return new ErrorEmbeddable(e, { id: e.id });
    }
  };
}

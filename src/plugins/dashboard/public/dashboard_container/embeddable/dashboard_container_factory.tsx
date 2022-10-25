/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import {
  Container,
  ErrorEmbeddable,
  ContainerOutput,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
} from '@kbn/embeddable-plugin/public';

import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';

import { DASHBOARD_CONTAINER_TYPE } from '..';
import type { DashboardContainer } from './dashboard_container';
import { DEFAULT_DASHBOARD_INPUT } from '../../dashboard_constants';
import { createExtract, createInject, DashboardContainerInput } from '../../../common';

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
    return DEFAULT_DASHBOARD_INPUT;
  }

  public create = async (
    initialInput: DashboardContainerInput,
    parent?: Container
  ): Promise<DashboardContainer | ErrorEmbeddable> => {
    const { DashboardContainer: DashboardContainerEmbeddable } = await import(
      './dashboard_container'
    );
    return Promise.resolve(new DashboardContainerEmbeddable(initialInput, parent));
  };
}

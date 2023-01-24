/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { i18n } from '@kbn/i18n';

import {
  Container,
  ErrorEmbeddable,
  ContainerOutput,
  EmbeddableFactory,
  EmbeddableFactoryDefinition,
  EmbeddablePackageState,
} from '@kbn/embeddable-plugin/public';
import { SearchSessionInfoProvider } from '@kbn/data-plugin/public';
import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';

import { DASHBOARD_CONTAINER_TYPE } from '..';
import type { DashboardContainer } from './dashboard_container';
import { DEFAULT_DASHBOARD_INPUT } from '../../dashboard_constants';
import { createInject, createExtract, DashboardContainerInput } from '../../../common';
import { LoadDashboardFromSavedObjectReturn } from '../../services/dashboard_saved_object/lib/load_dashboard_state_from_saved_object';

export type DashboardContainerFactory = EmbeddableFactory<
  DashboardContainerInput,
  ContainerOutput,
  DashboardContainer
>;

export interface DashboardCreationOptions {
  initialInput?: Partial<DashboardContainerInput>;

  incomingEmbeddable?: EmbeddablePackageState;

  useSearchSessionsIntegration?: boolean;
  searchSessionSettings?: {
    sessionIdToRestore?: string;
    sessionIdUrlChangeObservable?: Observable<string | undefined>;
    getSearchSessionIdFromURL: () => string | undefined;
    removeSessionIdFromUrl: () => void;
    createSessionRestorationDataProvider: (
      container: DashboardContainer
    ) => SearchSessionInfoProvider;
  };

  useControlGroupIntegration?: boolean;
  useSessionStorageIntegration?: boolean;

  useUnifiedSearchIntegration?: boolean;
  unifiedSearchSettings?: { kbnUrlStateStorage: IKbnUrlStateStorage };

  validateLoadedSavedObject?: (result: LoadDashboardFromSavedObjectReturn) => boolean;
}

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
    parent?: Container,
    creationOptions?: DashboardCreationOptions,
    savedObjectId?: string
  ): Promise<DashboardContainer | ErrorEmbeddable> => {
    const dashboardCreationStartTime = performance.now();
    const { createDashboard } = await import('./create/create_dashboard');
    try {
      return Promise.resolve(
        createDashboard(creationOptions, dashboardCreationStartTime, savedObjectId)
      );
    } catch (e) {
      return new ErrorEmbeddable(e.text, { id: e.id });
    }
  };
}

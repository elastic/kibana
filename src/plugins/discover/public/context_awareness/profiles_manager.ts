/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataTableRecord } from '@kbn/discover-utils';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { isEqual } from 'lodash';
import { DataSourceType, isDataSourceType } from '../../common/data_sources';
import type { ComposableProfile } from './composable_profile';
import type {
  RootProfile,
  DataSourceProfile,
  DocumentProfile,
  RootProfileService,
  DataSourceProfileService,
  DocumentProfileService,
  RootProfileProviderParams,
  DataSourceProfileProviderParams,
  DocumentProfileProviderParams,
} from './profiles';

interface SerializedRootProfileParams {
  solutionNavId: RootProfileProviderParams['solutionNavId'];
}

interface SerializedDataSourceProfileParams {
  dataViewId: string | undefined;
  esqlQuery: string | undefined;
}

export class ProfilesManager {
  private rootProfile?: ComposableProfile<RootProfile>;
  private dataSourceProfile?: ComposableProfile<DataSourceProfile>;
  private documentProfiles?: Map<string, ComposableProfile<DocumentProfile>>;
  private prevRootProfileParams?: SerializedRootProfileParams;
  private prevDataSourceProfileParams?: SerializedDataSourceProfileParams;

  constructor(
    private readonly rootProfileService: RootProfileService,
    private readonly dataSourceProfileService: DataSourceProfileService,
    private readonly documentProfileService: DocumentProfileService
  ) {}

  public async resolveRootContext(params: RootProfileProviderParams) {
    const serializedParams = this.parseRootProfileParams(params);

    if (this.rootProfile && isEqual(this.prevRootProfileParams, serializedParams)) {
      return;
    }

    this.rootProfile = await this.rootProfileService.resolve(params);
    this.prevRootProfileParams = serializedParams;
  }

  public async resolveDataSourceContext(params: DataSourceProfileProviderParams) {
    const serializedParams = this.parseDataSourceProfileParams(params);

    if (this.dataSourceProfile && isEqual(this.prevDataSourceProfileParams, serializedParams)) {
      return;
    }

    this.dataSourceProfile = await this.dataSourceProfileService.resolve(params);
    this.prevDataSourceProfileParams = serializedParams;
  }

  public createDocumentContextCollector() {
    const documentProfiles = new Map<string, ComposableProfile<DocumentProfile>>();

    return {
      collect: (params: DocumentProfileProviderParams) => {
        documentProfiles.set(params.record.id, this.documentProfileService.resolve(params));
      },
      finalize: () => {
        this.documentProfiles = documentProfiles;
      },
    };
  }

  public getProfiles({ record }: { record?: DataTableRecord } = {}) {
    return [
      this.rootProfile,
      this.dataSourceProfile,
      record ? this.documentProfiles?.get(record.id) : undefined,
    ].filter(profileExists);
  }

  private parseRootProfileParams(params: RootProfileProviderParams): SerializedRootProfileParams {
    return {
      solutionNavId: params.solutionNavId,
    };
  }

  private parseDataSourceProfileParams(
    params: DataSourceProfileProviderParams
  ): SerializedDataSourceProfileParams {
    return {
      dataViewId: isDataSourceType(params.dataSource, DataSourceType.DataView)
        ? params.dataSource.dataViewId
        : undefined,
      esqlQuery:
        isDataSourceType(params.dataSource, DataSourceType.Esql) &&
        isOfAggregateQueryType(params.query)
          ? params.query.esql
          : undefined,
    };
  }
}

const profileExists = (profile?: ComposableProfile): profile is ComposableProfile => {
  return profile !== undefined;
};

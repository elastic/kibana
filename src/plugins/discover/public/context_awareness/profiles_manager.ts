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
import { BehaviorSubject, combineLatest, map } from 'rxjs';
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

export interface GetProfilesOptions {
  record?: DataTableRecord;
}

export class ProfilesManager {
  private rootProfile$ = new BehaviorSubject<ComposableProfile<RootProfile> | undefined>(undefined);
  private dataSourceProfile$ = new BehaviorSubject<
    ComposableProfile<DataSourceProfile> | undefined
  >(undefined);
  private documentProfiles$ = new BehaviorSubject<Map<string, ComposableProfile<DocumentProfile>>>(
    new Map()
  );
  private prevRootProfileParams?: SerializedRootProfileParams;
  private prevDataSourceProfileParams?: SerializedDataSourceProfileParams;
  private rootProfileAbortController?: AbortController;
  private dataSourceProfileAbortController?: AbortController;

  constructor(
    private readonly rootProfileService: RootProfileService,
    private readonly dataSourceProfileService: DataSourceProfileService,
    private readonly documentProfileService: DocumentProfileService
  ) {}

  public async resolveRootProfile(params: RootProfileProviderParams) {
    const serializedParams = this.serializeRootProfileParams(params);

    if (this.rootProfile$.getValue() && isEqual(this.prevRootProfileParams, serializedParams)) {
      return;
    }

    const abortController = new AbortController();
    this.rootProfileAbortController?.abort();
    this.rootProfileAbortController = abortController;

    const profile = await this.rootProfileService.resolve(params);

    if (abortController.signal.aborted) {
      return;
    }

    this.rootProfile$.next(profile);
    this.prevRootProfileParams = serializedParams;
  }

  public async resolveDataSourceProfile(params: DataSourceProfileProviderParams) {
    const serializedParams = this.serializeDataSourceProfileParams(params);

    if (
      this.dataSourceProfile$.getValue() &&
      isEqual(this.prevDataSourceProfileParams, serializedParams)
    ) {
      return;
    }

    const abortController = new AbortController();
    this.dataSourceProfileAbortController?.abort();
    this.dataSourceProfileAbortController = abortController;

    const profile = await this.dataSourceProfileService.resolve(params);

    if (abortController.signal.aborted) {
      return;
    }

    this.dataSourceProfile$.next(profile);
    this.prevDataSourceProfileParams = serializedParams;
  }

  public createDocumentProfilesCollector() {
    const documentProfiles = new Map<string, ComposableProfile<DocumentProfile>>();

    return {
      collect: (params: DocumentProfileProviderParams) => {
        documentProfiles.set(params.record.id, this.documentProfileService.resolve(params));
      },
      finalize: (clearExisting: boolean) => {
        if (clearExisting) {
          this.documentProfiles$.next(documentProfiles);
        } else {
          const existingProfiles = this.documentProfiles$.getValue();

          documentProfiles.forEach((profile, id) => {
            existingProfiles.set(id, profile);
          });

          this.documentProfiles$.next(existingProfiles);
        }
      },
    };
  }

  public getProfiles({ record }: GetProfilesOptions = {}) {
    return [
      this.rootProfile$.getValue(),
      this.dataSourceProfile$.getValue(),
      record ? this.documentProfiles$.getValue().get(record.id) : undefined,
    ].filter(profileExists);
  }

  public getProfiles$(options: GetProfilesOptions = {}) {
    return combineLatest([this.rootProfile$, this.dataSourceProfile$, this.documentProfiles$]).pipe(
      map(() => this.getProfiles(options))
    );
  }

  private serializeRootProfileParams(
    params: RootProfileProviderParams
  ): SerializedRootProfileParams {
    return {
      solutionNavId: params.solutionNavId,
    };
  }

  private serializeDataSourceProfileParams(
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

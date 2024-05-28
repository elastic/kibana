/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { isEqual, memoize } from 'lodash';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { DataSourceType, isDataSourceType } from '../../common/data_sources';
import type {
  RootProfileService,
  DataSourceProfileService,
  DocumentProfileService,
  RootProfileProviderParams,
  DataSourceProfileProviderParams,
  DocumentProfileProviderParams,
  RootContext,
  DataSourceContext,
  DocumentContext,
} from './profiles';
import type { ContextWithProfileId } from './profile_service';

interface SerializedRootProfileParams {
  solutionNavId: RootProfileProviderParams['solutionNavId'];
}

interface SerializedDataSourceProfileParams {
  dataViewId: string | undefined;
  esqlQuery: string | undefined;
}

interface DataTableRecordWithContext extends DataTableRecord {
  context: ContextWithProfileId<DocumentContext>;
}

export interface GetProfilesOptions {
  record?: DataTableRecord;
}

export class ProfilesManager {
  private readonly rootContext$: BehaviorSubject<ContextWithProfileId<RootContext>>;
  private readonly dataSourceContext$: BehaviorSubject<ContextWithProfileId<DataSourceContext>>;

  private prevRootProfileParams?: SerializedRootProfileParams;
  private prevDataSourceProfileParams?: SerializedDataSourceProfileParams;
  private rootProfileAbortController?: AbortController;
  private dataSourceProfileAbortController?: AbortController;

  constructor(
    private readonly rootProfileService: RootProfileService,
    private readonly dataSourceProfileService: DataSourceProfileService,
    private readonly documentProfileService: DocumentProfileService
  ) {
    this.rootContext$ = new BehaviorSubject(rootProfileService.defaultContext);
    this.dataSourceContext$ = new BehaviorSubject(dataSourceProfileService.defaultContext);
  }

  public async resolveRootProfile(params: RootProfileProviderParams) {
    const serializedParams = this.serializeRootProfileParams(params);

    if (isEqual(this.prevRootProfileParams, serializedParams)) {
      return;
    }

    const abortController = new AbortController();
    this.rootProfileAbortController?.abort();
    this.rootProfileAbortController = abortController;

    const context = await this.rootProfileService.resolve(params);

    if (abortController.signal.aborted) {
      return;
    }

    this.rootContext$.next(context);
    this.prevRootProfileParams = serializedParams;
  }

  public async resolveDataSourceProfile(params: DataSourceProfileProviderParams) {
    const serializedParams = this.serializeDataSourceProfileParams(params);

    if (isEqual(this.prevDataSourceProfileParams, serializedParams)) {
      return;
    }

    const abortController = new AbortController();
    this.dataSourceProfileAbortController?.abort();
    this.dataSourceProfileAbortController = abortController;

    const context = await this.dataSourceProfileService.resolve(params);

    if (abortController.signal.aborted) {
      return;
    }

    this.dataSourceContext$.next(context);
    this.prevDataSourceProfileParams = serializedParams;
  }

  public resolveDocumentProfile(params: DocumentProfileProviderParams) {
    Object.defineProperty(params.record, 'context', {
      get: memoize(() => this.documentProfileService.resolve(params)),
    });
  }

  public getProfiles({ record }: GetProfilesOptions = {}) {
    return [
      this.rootProfileService.getProfile(this.rootContext$.getValue()),
      this.dataSourceProfileService.getProfile(this.dataSourceContext$.getValue()),
      this.documentProfileService.getProfile(
        recordHasContext(record) ? record.context : this.documentProfileService.defaultContext
      ),
    ];
  }

  public getProfiles$(options: GetProfilesOptions = {}) {
    return combineLatest([this.rootContext$, this.dataSourceContext$]).pipe(
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

const recordHasContext = (
  record: DataTableRecord | undefined
): record is DataTableRecordWithContext => {
  return Boolean(record && 'context' in record);
};

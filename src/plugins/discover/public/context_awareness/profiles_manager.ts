/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { isEqual } from 'lodash';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { DataSourceType, isDataSourceType } from '../../common/data_sources';
import { addLog } from '../utils/add_log';
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

export type ProfilesManagerEbtContext = BehaviorSubject<{
  dscProfiles: string[];
}>;

/**
 * Options for the `getProfiles` method
 */
export interface GetProfilesOptions {
  /**
   * The data table record to use for the document profile
   */
  record?: DataTableRecord;
}

export class ProfilesManager {
  private readonly rootContext$: BehaviorSubject<ContextWithProfileId<RootContext>>;
  private readonly dataSourceContext$: BehaviorSubject<ContextWithProfileId<DataSourceContext>>;
  private readonly ebtContext$: ProfilesManagerEbtContext | undefined;

  private prevRootProfileParams?: SerializedRootProfileParams;
  private prevDataSourceProfileParams?: SerializedDataSourceProfileParams;
  private rootProfileAbortController?: AbortController;
  private dataSourceProfileAbortController?: AbortController;

  constructor(
    private readonly rootProfileService: RootProfileService,
    private readonly dataSourceProfileService: DataSourceProfileService,
    private readonly documentProfileService: DocumentProfileService,
    ebtContext$: ProfilesManagerEbtContext | undefined
  ) {
    this.rootContext$ = new BehaviorSubject(rootProfileService.defaultContext);
    this.dataSourceContext$ = new BehaviorSubject(dataSourceProfileService.defaultContext);
    this.ebtContext$ = ebtContext$;
  }

  /**
   * Resolves the root context profile
   * @param params The root profile provider parameters
   */
  public async resolveRootProfile(params: RootProfileProviderParams) {
    const serializedParams = serializeRootProfileParams(params);

    if (isEqual(this.prevRootProfileParams, serializedParams)) {
      return;
    }

    const abortController = new AbortController();
    this.rootProfileAbortController?.abort();
    this.rootProfileAbortController = abortController;

    let context = this.rootProfileService.defaultContext;

    try {
      context = await this.rootProfileService.resolve(params);
    } catch (e) {
      logResolutionError(ContextType.Root, serializedParams, e);
    }

    if (abortController.signal.aborted) {
      return;
    }

    this.rootContext$.next(context);
    this.prevRootProfileParams = serializedParams;
  }

  /**
   * Resolves the data source context profile
   * @param params The data source profile provider parameters
   */
  public async resolveDataSourceProfile(
    params: Omit<DataSourceProfileProviderParams, 'rootContext'>
  ) {
    const serializedParams = serializeDataSourceProfileParams(params);

    if (isEqual(this.prevDataSourceProfileParams, serializedParams)) {
      return;
    }

    const abortController = new AbortController();
    this.dataSourceProfileAbortController?.abort();
    this.dataSourceProfileAbortController = abortController;

    let context = this.dataSourceProfileService.defaultContext;

    try {
      context = await this.dataSourceProfileService.resolve({
        ...params,
        rootContext: this.rootContext$.getValue(),
      });
    } catch (e) {
      logResolutionError(ContextType.DataSource, serializedParams, e);
    }

    if (abortController.signal.aborted) {
      return;
    }

    this.trackActiveProfiles(this.rootContext$.getValue().profileId, context.profileId);
    this.dataSourceContext$.next(context);
    this.prevDataSourceProfileParams = serializedParams;
  }

  /**
   * Resolves the document context profile for a given data table record
   * @param params The document profile provider parameters
   * @returns The data table record with a resolved document context
   */
  public resolveDocumentProfile(
    params: Omit<DocumentProfileProviderParams, 'rootContext' | 'dataSourceContext'>
  ) {
    let context: ContextWithProfileId<DocumentContext> | undefined;

    return new Proxy(params.record, {
      has: (target, prop) => prop === 'context' || Reflect.has(target, prop),
      get: (target, prop, receiver) => {
        if (prop !== 'context') {
          return Reflect.get(target, prop, receiver);
        }

        if (!context) {
          try {
            context = this.documentProfileService.resolve({
              ...params,
              rootContext: this.rootContext$.getValue(),
              dataSourceContext: this.dataSourceContext$.getValue(),
            });
          } catch (e) {
            logResolutionError(ContextType.Document, { recordId: params.record.id }, e);
            context = this.documentProfileService.defaultContext;
          }
        }

        return context;
      },
    });
  }

  /**
   * Retrieves an array of the resolved profiles
   * @param options Options for getting the profiles
   * @returns The resolved profiles
   */
  public getProfiles({ record }: GetProfilesOptions = {}) {
    return [
      this.rootProfileService.getProfile(this.rootContext$.getValue()),
      this.dataSourceProfileService.getProfile(this.dataSourceContext$.getValue()),
      this.documentProfileService.getProfile(
        recordHasContext(record) ? record.context : this.documentProfileService.defaultContext
      ),
    ];
  }

  /**
   * Retrieves an observable of the resolved profiles that emits when the profiles change
   * @param options Options for getting the profiles
   * @returns The resolved profiles as an observable
   */
  public getProfiles$(options: GetProfilesOptions = {}) {
    return combineLatest([this.rootContext$, this.dataSourceContext$]).pipe(
      map(() => this.getProfiles(options))
    );
  }

  /**
   * Tracks the active profiles in the EBT context
   */
  private trackActiveProfiles(rootContextProfileId: string, dataSourceContextProfileId: string) {
    const dscProfiles = [rootContextProfileId, dataSourceContextProfileId];
    // if (this.ebtContext$) {
    //   console.log('dscProfiles', dscProfiles);
    // }
    // EBT context was enabled only for Discover pages and not for Dashboard panels, Log Explorer, Security Solution, etc.
    this.ebtContext$?.next({
      dscProfiles,
    });
  }
}

const serializeRootProfileParams = (
  params: RootProfileProviderParams
): SerializedRootProfileParams => {
  return {
    solutionNavId: params.solutionNavId,
  };
};

const serializeDataSourceProfileParams = (
  params: Omit<DataSourceProfileProviderParams, 'rootContext'>
): SerializedDataSourceProfileParams => {
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
};

const recordHasContext = (
  record: DataTableRecord | undefined
): record is DataTableRecordWithContext => {
  return Boolean(record && 'context' in record);
};

enum ContextType {
  Root = 'root',
  DataSource = 'data source',
  Document = 'document',
}

const logResolutionError = <TParams, TError>(
  profileType: ContextType,
  params: TParams,
  error: TError
) => {
  addLog(
    `[ProfilesManager] ${profileType} context resolution failed with params: ${JSON.stringify(
      params,
      null,
      2
    )}`,
    error
  );
};

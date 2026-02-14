/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, combineLatest, map } from 'rxjs';
import type { DataTableRecord } from '@kbn/discover-utils';
import { isEqual } from 'lodash';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { AbortReason } from '@kbn/kibana-utils-plugin/common';
import type { ContextWithProfileId } from '../profile_service';
import type {
  DataSourceContext,
  DataSourceProfileProviderParams,
  DataSourceProfileService,
} from '../profiles/data_source_profile';
import type { RootProfileService } from '../profiles/root_profile';
import type { AppliedProfile } from '../composable_profile';
import type { DiscoverContextAwarenessToolkit } from '../toolkit';
import { EMPTY_DISCOVER_CONTEXT_AWARENESS_TOOLKIT } from '../toolkit';
import type {
  DocumentContext,
  DocumentProfileProviderParams,
  DocumentProfileService,
} from '../profiles/document_profile';
import type { RootContext } from '../profiles/root_profile';
import type { ScopedDiscoverEBTManager } from '../../ebt_manager';
import { logResolutionError } from './utils';
import { DataSourceType, isDataSourceType } from '../../../common/data_sources';
import { ContextualProfileLevel } from './consts';
import { recordHasContext } from './record_has_context';

interface SerializedDataSourceProfileParams {
  dataViewId: string | undefined;
  esqlQuery: string | undefined;
}

export interface DataTableRecordWithContext extends DataTableRecord {
  context: ContextWithProfileId<DocumentContext>;
}

/**
 * Options for the `getProfiles` method
 */
export interface GetProfilesOptions {
  /**
   * The data table record to use for the document profile
   */
  record?: DataTableRecord;
}

export class ScopedProfilesManager {
  private readonly dataSourceContext$: BehaviorSubject<ContextWithProfileId<DataSourceContext>>;
  private prevDataSourceProfileParams?: SerializedDataSourceProfileParams;
  private dataSourceProfileAbortController?: AbortController;

  private cachedToolkit?: DiscoverContextAwarenessToolkit;

  private cachedRootContext?: ContextWithProfileId<RootContext>;
  private cachedRootProfile?: AppliedProfile;

  private cachedDataSourceContext?: ContextWithProfileId<DataSourceContext>;
  private cachedDataSourceProfile?: AppliedProfile;

  private cachedDocumentContext?: ContextWithProfileId<DocumentContext>;
  private cachedDocumentProfile?: AppliedProfile;

  constructor(
    private readonly rootContext$: BehaviorSubject<ContextWithProfileId<RootContext>>,
    private readonly rootProfileService: RootProfileService,
    private readonly dataSourceProfileService: DataSourceProfileService,
    private readonly documentProfileService: DocumentProfileService,
    private readonly scopedEbtManager: ScopedDiscoverEBTManager
  ) {
    this.dataSourceContext$ = new BehaviorSubject(dataSourceProfileService.defaultContext);
  }

  /**
   * Resolves the data source context profile
   * @param params The data source profile provider parameters
   * @param onBeforeChange An optional callback to be invoked before changing the context
   */
  public async resolveDataSourceProfile(
    params: Omit<DataSourceProfileProviderParams, 'rootContext'>,
    onBeforeChange?: () => void
  ) {
    const serializedParams = serializeDataSourceProfileParams(params);

    if (isEqual(this.prevDataSourceProfileParams, serializedParams)) {
      return;
    }

    const abortController = new AbortController();
    this.dataSourceProfileAbortController?.abort(AbortReason.REPLACED);
    this.dataSourceProfileAbortController = abortController;

    let context = this.dataSourceProfileService.defaultContext;

    try {
      context = await this.dataSourceProfileService.resolve({
        ...params,
        rootContext: this.rootContext$.getValue(),
      });
    } catch (e) {
      logResolutionError(ContextualProfileLevel.dataSourceLevel, serializedParams, e);
    }

    if (abortController.signal.aborted) {
      return;
    }

    onBeforeChange?.();
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
    let cachedRootContext: ContextWithProfileId<RootContext> | undefined;
    let cachedDataSourceContext: ContextWithProfileId<DataSourceContext> | undefined;

    return new Proxy(params.record, {
      has: (target, prop) => prop === 'context' || Reflect.has(target, prop),
      get: (target, prop, receiver) => {
        if (prop !== 'context') {
          return Reflect.get(target, prop, receiver);
        }

        const rootContext = this.rootContext$.getValue();
        const dataSourceContext = this.dataSourceContext$.getValue();

        if (
          !context ||
          cachedRootContext !== rootContext ||
          cachedDataSourceContext !== dataSourceContext
        ) {
          try {
            context = this.documentProfileService.resolve({
              ...params,
              rootContext,
              dataSourceContext,
            });
          } catch (e) {
            logResolutionError(
              ContextualProfileLevel.documentLevel,
              { recordId: params.record.id },
              e
            );
            context = this.documentProfileService.defaultContext;
          }

          cachedRootContext = rootContext;
          cachedDataSourceContext = dataSourceContext;

          this.scopedEbtManager.trackContextualProfileResolvedEvent({
            contextLevel: ContextualProfileLevel.documentLevel,
            profileId: context.profileId,
          });
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
  public getProfiles({
    record,
    toolkit = EMPTY_DISCOVER_CONTEXT_AWARENESS_TOOLKIT,
  }: GetProfilesOptions & { toolkit?: DiscoverContextAwarenessToolkit } = {}) {
    const rootContext = this.rootContext$.getValue();
    const dataSourceContext = this.dataSourceContext$.getValue();
    const documentContext = recordHasContext(record)
      ? record.context
      : this.documentProfileService.defaultContext;

    const toolkitChanged = this.cachedToolkit !== toolkit;

    if (toolkitChanged) {
      this.cachedToolkit = toolkit;
    }

    if (toolkitChanged || this.cachedRootContext !== rootContext || !this.cachedRootProfile) {
      this.cachedRootContext = rootContext;
      this.cachedRootProfile = this.rootProfileService.getProfile({
        context: rootContext,
        toolkit,
      });
    }

    if (
      toolkitChanged ||
      this.cachedDataSourceContext !== dataSourceContext ||
      !this.cachedDataSourceProfile
    ) {
      this.cachedDataSourceContext = dataSourceContext;
      this.cachedDataSourceProfile = this.dataSourceProfileService.getProfile({
        context: dataSourceContext,
        toolkit,
      });
    }

    if (
      toolkitChanged ||
      this.cachedDocumentContext !== documentContext ||
      !this.cachedDocumentProfile
    ) {
      this.cachedDocumentContext = documentContext;
      this.cachedDocumentProfile = this.documentProfileService.getProfile({
        context: documentContext,
        toolkit,
      });
    }

    return [this.cachedRootProfile, this.cachedDataSourceProfile, this.cachedDocumentProfile];
  }

  /**
   * Retrieves an observable of the resolved profiles that emits when the profiles change
   * @param options Options for getting the profiles
   * @returns The resolved profiles as an observable
   */
  public getProfiles$(options: GetProfilesOptions & { toolkit?: DiscoverContextAwarenessToolkit }) {
    return combineLatest([this.rootContext$, this.dataSourceContext$]).pipe(
      map(() => this.getProfiles(options))
    );
  }

  public getContexts() {
    return {
      rootContext: this.rootContext$.getValue(),
      dataSourceContext: this.dataSourceContext$.getValue(),
    };
  }

  /**
   * Tracks the active profiles in the EBT context
   */
  private trackActiveProfiles(rootContextProfileId: string, dataSourceContextProfileId: string) {
    const dscProfiles = [rootContextProfileId, dataSourceContextProfileId];

    this.scopedEbtManager.trackContextualProfileResolvedEvent({
      contextLevel: ContextualProfileLevel.rootLevel,
      profileId: rootContextProfileId,
    });
    this.scopedEbtManager.trackContextualProfileResolvedEvent({
      contextLevel: ContextualProfileLevel.dataSourceLevel,
      profileId: dataSourceContextProfileId,
    });

    this.scopedEbtManager.updateProfilesContextWith(dscProfiles);
  }
}

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

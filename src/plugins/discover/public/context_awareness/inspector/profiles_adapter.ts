/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import { BehaviorSubject, combineLatest, map, skip, Subject } from 'rxjs';
import type { DataSourceContext, RootContext } from '../profiles';
import type { ContextWithProfileId } from '../profile_service';
import { DataTableRecordWithContext, recordHasContext } from '../record_has_context';

export class ProfilesAdapter {
  private readonly rootContext$ = new BehaviorSubject<
    ContextWithProfileId<RootContext> | undefined
  >(undefined);
  private readonly dataSourceContext$ = new BehaviorSubject<
    ContextWithProfileId<DataSourceContext> | undefined
  >(undefined);
  private readonly documentContexts$ = new BehaviorSubject<
    Record<string, DataTableRecordWithContext[]> | undefined
  >(undefined);
  private readonly viewRecordDetails$ = new Subject<DataTableRecord>();

  setRootContext(rootContext: ContextWithProfileId<RootContext>) {
    this.rootContext$.next(rootContext);
  }

  setDataSourceContext(dataSourceContext: ContextWithProfileId<DataSourceContext>) {
    this.dataSourceContext$.next(dataSourceContext);
  }

  setDocumentContexts(records: DataTableRecord[]) {
    const documentContexts: Record<string, DataTableRecordWithContext[]> = {};

    for (const record of records) {
      if (recordHasContext(record)) {
        if (!documentContexts[record.context.profileId]) {
          documentContexts[record.context.profileId] = [];
        }

        documentContexts[record.context.profileId].push(record);
      }
    }

    this.documentContexts$.next(documentContexts);
  }

  getContexts() {
    return {
      rootContext: this.rootContext$.getValue(),
      dataSourceContext: this.dataSourceContext$.getValue(),
      documentContexts: this.documentContexts$.getValue(),
    };
  }

  getContexts$() {
    return combineLatest([this.rootContext$, this.dataSourceContext$, this.documentContexts$]).pipe(
      map(() => this.getContexts()),
      skip(1)
    );
  }

  viewRecordDetails(record: DataTableRecord) {
    this.viewRecordDetails$.next(record);
  }

  getViewRecordDetails$() {
    return this.viewRecordDetails$.asObservable();
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import EventEmitter from 'events';
import type { DataSourceContext, RootContext } from '../profiles';
import type { ContextWithProfileId } from '../profile_service';
import { DataTableRecordWithContext, recordHasContext } from '../record_has_context';

export class ProfilesAdapter extends EventEmitter {
  private rootContext?: ContextWithProfileId<RootContext>;
  private dataSourceContext?: ContextWithProfileId<DataSourceContext>;
  private documentContexts?: Record<string, DataTableRecordWithContext[]>;

  setRootContext(rootContext: ContextWithProfileId<RootContext>) {
    this.rootContext = rootContext;
    this.onChange();
  }

  setDataSourceContext(dataSourceContext: ContextWithProfileId<DataSourceContext>) {
    this.dataSourceContext = dataSourceContext;
    this.onChange();
  }

  setDocumentContexts(documentContexts: DataTableRecord[]) {
    const documentContextsMap: Record<string, DataTableRecordWithContext[]> = {};

    for (const record of documentContexts) {
      if (recordHasContext(record)) {
        if (!documentContextsMap[record.context.profileId]) {
          documentContextsMap[record.context.profileId] = [];
        }

        documentContextsMap[record.context.profileId].push(record);
      }
    }

    this.documentContexts = documentContextsMap;
    this.onChange();
  }

  getContexts() {
    return {
      rootContext: this.rootContext,
      dataSourceContext: this.dataSourceContext,
      documentContexts: this.documentContexts,
    };
  }

  private onChange() {
    this.emit('change');
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiTableFieldDataColumnType } from '@elastic/eui';
import type { Capabilities } from 'src/core/public';
import { SavedObjectsManagementRecord } from '.';

interface ColumnContext {
  capabilities: Capabilities;
}

export abstract class SavedObjectsManagementColumn {
  public abstract id: string;
  public abstract euiColumn: Omit<
    EuiTableFieldDataColumnType<SavedObjectsManagementRecord>,
    'sortable'
  >;
  public refreshOnFinish?: () => Array<{ type: string; id: string }>;

  private callbacks: Function[] = [];

  protected columnContext: ColumnContext | null = null;

  public setColumnContext(columnContext: ColumnContext) {
    this.columnContext = columnContext;
  }

  public registerOnFinishCallback(callback: Function) {
    this.callbacks.push(callback);
  }

  protected finish() {
    this.callbacks.forEach((callback) => callback());
  }
}

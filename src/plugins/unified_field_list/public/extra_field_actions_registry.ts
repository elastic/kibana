/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import { AddFieldFilterHandler } from './types';

export interface Action {
  title: string;
  icon: string;
  onClick: () => Promise<void>;
  canShow: () => boolean;
}

type ActionGetter = (
  field: DataViewField,
  dataView: DataView,
  onAddFilter?: AddFieldFilterHandler
) => Action;

export class ExtraFieldActionsRegistry {
  private actionGetters: ActionGetter[] = [];

  /**
   * Extends and adds the given doc view to the registry array
   */
  addExtraFieldAction(actionGetter: ActionGetter) {
    this.actionGetters.push(actionGetter);
  }
  /**
   * Returns a sorted array of doc_views for rendering tabs
   */
  getActionsGetters() {
    return this.actionGetters;
  }
}

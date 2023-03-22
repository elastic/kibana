/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export interface Action {
  title: string;
  icon: string;
  onClick: () => void;
}

type ActionGetter = (fieldName: string) => Action;

export class ExtraFieldActionsRegistry {
  private actions: ActionGetter[] = [];

  /**
   * Extends and adds the given doc view to the registry array
   */
  addExtraFieldAction(action: ActionGetter) {
    this.actions.push(action);
  }
  /**
   * Returns a sorted array of doc_views for rendering tabs
   */
  getActions() {
    return this.actions;
  }
}

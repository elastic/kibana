/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactNode } from 'react';
import type { Capabilities } from 'src/core/public';
import { SavedObjectsManagementRecord } from '.';

interface ActionContext {
  capabilities: Capabilities;
}

export abstract class SavedObjectsManagementAction {
  public abstract render: () => ReactNode;
  public abstract id: string;
  public abstract euiAction: {
    name: string;
    description: string;
    icon: string;
    type: string;
    available?: (item: SavedObjectsManagementRecord) => boolean;
    enabled?: (item: SavedObjectsManagementRecord) => boolean;
    onClick?: (item: SavedObjectsManagementRecord) => void;
    render?: (item: SavedObjectsManagementRecord) => any;
  };
  public refreshOnFinish?: () => Array<{ type: string; id: string }>;

  private callbacks: Function[] = [];

  protected actionContext: ActionContext | null = null;
  protected record: SavedObjectsManagementRecord | null = null;

  public setActionContext(actionContext: ActionContext) {
    this.actionContext = actionContext;
  }

  public registerOnFinishCallback(callback: Function) {
    this.callbacks.push(callback);
  }

  protected start(record: SavedObjectsManagementRecord) {
    this.record = record;
  }

  protected finish() {
    this.record = null;
    this.callbacks.forEach((callback) => callback());
  }
}

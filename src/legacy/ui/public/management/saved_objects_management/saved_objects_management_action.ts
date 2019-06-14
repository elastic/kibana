/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { ReactNode } from '@elastic/eui/node_modules/@types/react';

export interface SavedObjectRecord {
  type: string;
  id: string;
  meta: {
    icon: string;
    title: string;
  };
}

export abstract class SavedObjectsManagementAction<T = unknown> {
  public abstract render: () => ReactNode;
  public abstract id: string;
  public abstract euiAction: {
    name: string;
    description: string;
    icon: string;
    type: string;
    available?: (item: SavedObjectRecord) => boolean;
    enabled?: (item: SavedObjectRecord) => boolean;
    onClick?: (item: SavedObjectRecord) => void;
    render?: (item: SavedObjectRecord) => any;
  };

  private isActive: boolean = false;
  private callbacks: Function[] = [];

  protected context: T | null = null;

  public registerOnFinishCallback(callback: Function) {
    this.callbacks.push(callback);
  }

  public get active() {
    return this.isActive;
  }

  protected start(context: T) {
    this.isActive = true;
    this.context = context;
  }

  protected finish() {
    this.isActive = false;
    this.context = null;
    this.callbacks.forEach(callback => callback());
  }
}

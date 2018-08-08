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

export type SystemName = string;
export interface SystemMetadata {
  [key: string]: any;
}

export interface SystemsType {
  [systemName: string]: any;
}

export abstract class KibanaSystem<C, D extends SystemsType, E = void> {
  constructor(readonly kibana: C, readonly deps: D) {}

  public abstract start(): E;

  public stop() {
    // default implementation of stop does nothing
  }
}

/**
 * Defines the "static side" of the Kibana system class.
 *
 * When a class implements an interface, only the instance side of the class is
 * checked, so you can't include static methods there. Because of that we have
 * a separate interface for the static side, which we can use to specify that we
 * want a _class_ (not an instance) that matches this interface.
 *
 * See https://www.typescriptlang.org/docs/handbook/interfaces.html#difference-between-the-static-and-instance-sides-of-classes
 */
export interface KibanaSystemClassStatic<C, D extends SystemsType, E = void> {
  new (kibana: C, deps: D): KibanaSystem<C, D, E>;
}

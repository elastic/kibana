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

import { ContextContainer, ContextContainerImplementation } from './context';

interface StartDeps {
  pluginDependencies: ReadonlyMap<string, string[]>;
}

/** @internal */
export class ContextService {
  private readonly containers = new Set<ContextContainerImplementation<any, any, any>>();

  public setup({ pluginDependencies }: StartDeps): ContextSetup {
    return {
      setCurrentPlugin: this.setCurrentPlugin.bind(this),
      createContextContainer: <
        TContext extends {},
        THandlerReturn,
        THandlerParameters extends any[] = []
      >() => {
        const newContainer = new ContextContainerImplementation<
          TContext,
          THandlerReturn,
          THandlerParameters
        >(pluginDependencies);

        this.containers.add(newContainer);
        return newContainer;
      },
    };
  }

  public start(): ContextStart {
    return {
      setCurrentPlugin: this.setCurrentPlugin.bind(this),
    };
  }

  private setCurrentPlugin(plugin?: string) {
    [...this.containers].forEach(container => container.setCurrentPlugin(plugin));
  }
}

/**
 * {@inheritdoc ContextContainer}
 *
 * @example
 * How to create your own context
 * ```ts
 * class MyPlugin {
 *   setup(core) {
 *     this.myHandlers = new Map<string, Handler>();
 *     this.contextContainer = core.createContextContainer();
 *     return {
 *       registerContext: this.contextContainer.register,
 *       registerHandler: (endpoint, handler) =>
 *         // `createHandler` must be called immediately.
 *         this.myHandlers.set(endpoint, this.contextContainer.createHandler(handler)),
 *     };
 *   }
 *
 *   start() {
 *     return {
 *       registerContext: this.contextContainer.register,
 *     };
 *   }
 * }
 * ```
 *
 * @public
 */
export interface ContextSetup {
  /**
   * Must be called by the PluginsService during each plugin's lifecycle methods.
   * @internal
   */
  setCurrentPlugin(plugin?: string): void;

  /**
   * Creates a new {@link ContextContainer} for a service owner.
   */
  createContextContainer<
    TContext extends {},
    THandlerReturn,
    THandlerParmaters extends any[] = []
  >(): ContextContainer<TContext, THandlerReturn, THandlerParmaters>;
}

/** @internal */
export interface ContextStart {
  /**
   * @internal
   */
  setCurrentPlugin(plugin?: string): void;
}

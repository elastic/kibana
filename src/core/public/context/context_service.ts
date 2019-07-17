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
 * Say we're creating a plugin for rendering visualizations that allows new rendering methods to be registered. If we
 * want to offer context to these rendering methods, we can leverage the ContextService to manage these contexts.
 * ```ts
 * export interface VizRenderContext {
 *   core: {
 *     i18n: I18nStart;
 *     uiSettings: UISettingsClientContract;
 *   }
 *   [contextName: string]: unknown;
 * }
 *
 * export type VizRenderer = (context: VizRenderContext, domElement: HTMLElement) => () => void;
 *
 * class VizRenderingPlugin {
 *   private readonly vizRenderers = new Map<string, ((domElement: HTMLElement) => () => void)>();
 *
 *   setup(core) {
 *     this.contextContainer = core.createContextContainer<
 *       VizRenderContext,
 *       ReturnType<VizRenderer>,
 *       [HTMLElement]
 *     >();
 *
 *     return {
 *       registerContext: this.contextContainer.register,
 *       registerVizRenderer: (renderMethod: string, renderer: VizTypeRenderer) =>
 *         // `createHandler` must be called immediately during the calling plugin's lifecycle method.
 *         this.vizRenderers.set(renderMethod, this.contextContainer.createHandler(renderer)),
 *     };
 *   }
 *
 *   start(core) {
 *     // Register the core context available to all renderers
 *     this.contextContainer.register('core', () => ({
 *       i18n: core.i18n,
 *       uiSettings: core.uiSettings
 *     }));
 *
 *     return {
 *       registerContext: this.contextContainer.register,
 *       // The handler can now be called directly with only an `HTMLElement` and will automaticallly
 *       // have the `context` argument supplied.
 *       renderVizualization: (renderMethod: string, domElement: HTMLElement) => {
 *         if (!this.vizRenderer.has(renderMethod)) {
 *           throw new Error(`Render method ${renderMethod} has not be registered`);
 *         }
 *
 *         return this.vizRenderers.get(renderMethod)(domElement);
 *       }
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

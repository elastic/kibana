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

export interface ExpressionRenderDefinition<Config = unknown> {
  /**
   * Technical name of the renderer, used as ID to identify renderer in
   * expression renderer registry. This must match the name of the expression
   * function that is used to create the `type: render` object.
   */
  name: string;

  /**
   * A user friendly name of the renderer as will be displayed to user in UI.
   */
  displayName: string;

  /**
   * Help text as will be displayed to user. A sentence or few about what this
   * element does.
   */
  help?: string;

  /**
   * Used to validate the data before calling the render function.
   */
  validate?: () => undefined | Error;

  /**
   * Tell the renderer if the dom node should be reused, it's recreated each
   * time by default.
   */
  reuseDomNode: boolean;

  /**
   * The function called to render the output data of an expression.
   */
  render: (
    domNode: HTMLElement,
    config: Config,
    handlers: IInterpreterRenderHandlers
  ) => void | Promise<void>;
}

export type AnyExpressionRenderDefinition = ExpressionRenderDefinition<any>;

export interface IInterpreterRenderHandlers {
  /**
   * Done increments the number of rendering successes
   */
  done: () => void;
  onDestroy: (fn: () => void) => void;
  reload: () => void;
  update: (params: any) => void;
  event: (event: any) => void;
}

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

import { ExpressionRenderDefinition, IInterpreterRenderHandlers } from './types';

export class ExpressionRenderer<Config = unknown> {
  /**
   * This must match the name of the function that is used to create the `type: render` object.
   */
  name: string;

  /**
   * Use this to set a more friendly name.
   */
  displayName: string;

  /**
   * A sentence or few about what this element does.
   */
  help: string;

  /**
   * Used to validate the data before calling the render function.
   */
  validate: () => void | Error;

  /**
   * Tell the renderer if the dom node should be reused, it's recreated each time by default.
   */
  reuseDomNode: boolean;

  /**
   * The function called to render the data.
   */
  render: (el: HTMLElement, config: Config, handlers: IInterpreterRenderHandlers) => Promise<void>;

  constructor(config: ExpressionRenderDefinition<Config>) {
    const { name, displayName, help, validate, reuseDomNode, render } = config;

    this.name = name;
    this.displayName = displayName || name;
    this.help = help || '';
    this.validate = validate || (() => {});
    this.reuseDomNode = Boolean(reuseDomNode);
    this.render = render;
  }
}

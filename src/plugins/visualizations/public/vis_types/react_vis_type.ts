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

import { BaseVisType, BaseVisTypeOptions } from './base_vis_type';
import { ReactVisController } from './react_vis_controller';
import { VisType } from './types';

export type ReactVisTypeOptions<TVisParams> = Omit<
  BaseVisTypeOptions<TVisParams>,
  'visualization' | 'toExpressionAst'
>;

/**
 * This class should only be used for visualizations not using the `toExpressionAst` with a custom renderer.
 * If you implement a custom renderer you should just mount a react component inside this.
 */
export class ReactVisType<TVisParams>
  extends BaseVisType<TVisParams>
  implements VisType<TVisParams> {
  constructor(opts: ReactVisTypeOptions<TVisParams>) {
    super({
      ...opts,
      visualization: ReactVisController,
    });

    if (!this.visConfig.component) {
      throw new Error('Missing component for ReactVisType');
    }
  }
}

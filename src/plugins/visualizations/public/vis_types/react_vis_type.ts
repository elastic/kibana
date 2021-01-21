/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

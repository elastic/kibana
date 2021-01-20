/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { VisualizationController } from '../types';
import { getI18n, getUISettings } from '../services';
import { ExprVis } from '../expressions/vis';

export class ReactVisController implements VisualizationController {
  constructor(private element: HTMLElement, private vis: ExprVis) {}

  public render(visData: any, visParams: any): Promise<void> {
    const I18nContext = getI18n().Context;

    return new Promise((resolve, reject) => {
      if (!this.vis.type || !this.vis.type.visConfig || !this.vis.type.visConfig.component) {
        reject('Missing component for ReactVisType');
      }

      const Component = this.vis.type.visConfig.component;
      const config = getUISettings();
      render(
        <I18nContext>
          <Component
            config={config}
            vis={this.vis}
            visData={visData}
            visParams={visParams}
            renderComplete={resolve}
          />
        </I18nContext>,
        this.element
      );
    });
  }

  public destroy() {
    unmountComponentAtNode(this.element);
  }
}

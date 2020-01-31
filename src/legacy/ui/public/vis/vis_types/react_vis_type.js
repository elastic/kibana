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

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import chrome from '../../chrome';
import { I18nContext } from '../../i18n';
import { BaseVisType } from './base_vis_type';

class ReactVisController {
  constructor(element, vis) {
    this.el = element;
    this.vis = vis;
  }

  render(visData, visParams, updateStatus) {
    this.visData = visData;

    return new Promise(resolve => {
      const Component = this.vis.type.visConfig.component;
      const config = chrome.getUiSettingsClient();
      render(
        <I18nContext>
          <Component
            config={config}
            vis={this.vis}
            visData={visData}
            visParams={visParams}
            renderComplete={resolve}
            updateStatus={updateStatus}
          />
        </I18nContext>,
        this.el
      );
    });
  }

  destroy() {
    unmountComponentAtNode(this.el);
  }
}

export class ReactVisType extends BaseVisType {
  constructor(opts) {
    super({
      ...opts,
      visualization: ReactVisController,
    });

    if (!this.visConfig.component) {
      throw new Error('Missing component for ReactVisType');
    }
  }
}

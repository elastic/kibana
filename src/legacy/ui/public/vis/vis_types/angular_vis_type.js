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

import { BaseVisType } from './base_vis_type';
import $ from 'jquery';


export function AngularVisTypeProvider($compile, $rootScope) {

  class AngularVisController {
    constructor(domeElement, vis) {
      this.el = $(domeElement);
      this.vis = vis;
    }

    render(esResponse, visParams, status) {

      return new Promise((resolve, reject) => {
        const updateScope = () => {
          this.$scope.vis = this.vis;
          this.$scope.visState = this.vis.getState();
          this.$scope.esResponse = esResponse;
          this.$scope.visParams = visParams;
          this.$scope.renderComplete = resolve;
          this.$scope.renderFailed = reject;
          this.$scope.resize = Date.now();
          this.$scope.updateStatus = status;
          this.$scope.$apply();
        };

        if (!this.$scope) {
          this.$scope = $rootScope.$new();
          this.$scope.uiState = this.vis.getUiState();
          updateScope();
          this.el.html($compile(this.vis.type.visConfig.template)(this.$scope));
          this.$scope.$apply();
        } else {
          updateScope();
        }
      });
    }

    destroy() {
      if (this.$scope) {
        this.$scope.$destroy();
        this.$scope = null;
      }
    }
  }

  class AngularVisType extends BaseVisType {
    constructor(opts) {
      opts.visualization = AngularVisController;

      super(opts);

      this.visConfig.template = opts.visConfig ? opts.visConfig.template : opts.template;
      if (!this.visConfig.template) {
        throw new Error('Missing template for AngularVisType');
      }
    }
  }

  return AngularVisType;
}

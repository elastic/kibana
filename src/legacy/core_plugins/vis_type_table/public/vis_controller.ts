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

import angular from 'angular';
import $ from 'jquery';
import { npStart } from 'ui/new_platform';
import { getAngularModule } from './get_inner_angular';
import { Vis } from '../../visualizations/public';

import { start as navigation } from '../../navigation/public/legacy';
import { initTableVisLegacyModule } from './shim/table_vis_legacy_module';

const innerAngularName = 'kibana/table_vis';

interface ITableVisController {
  el: JQuery<Element>;
  vis: Vis;
}
export class TableVisController implements ITableVisController {
  private innerAngularBootstrapped: boolean = false;
  private injector: any;
  el: JQuery<Element>;
  vis: Vis;
  $rootScope: any;
  $scope: any;
  $compile: any;

  constructor(domeElement: Element, vis: Vis) {
    this.el = $(domeElement);
    this.vis = vis;
  }

  async getInjector() {
    if (!this.injector) {
      const mountpoint = document.createElement('div');
      mountpoint.setAttribute('style', 'height: 100%; width: 100%;');
      this.injector = angular.bootstrap(mountpoint, [innerAngularName]);
      this.el.append(mountpoint);
    }

    return this.injector;
  }

  async render(esResponse: any, visParams: any, status: any) {
    if (!this.innerAngularBootstrapped) {
      this.bootstrapInnerAngular();
    }

    return new Promise(async (resolve, reject) => {
      if (!this.$rootScope) {
        const $injector = await this.getInjector();
        this.$rootScope = $injector.get('$rootScope');
        this.$compile = $injector.get('$compile');
      }
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
        this.$scope = this.$rootScope.$new();
        this.$scope.uiState = this.vis.getUiState();
        updateScope();
        this.el.find('div').html(this.$compile(this.vis.type.visConfig.template)(this.$scope));
        this.$scope.$apply();
      } else {
        updateScope();
      }
    });
  }

  bootstrapInnerAngular = async () => {
    if (!this.innerAngularBootstrapped) {
      const tableVisModule = getAngularModule(innerAngularName, npStart.core, { navigation });
      initTableVisLegacyModule(tableVisModule);
      this.innerAngularBootstrapped = true;
    }
  };

  destroy() {
    if (this.$rootScope) {
      this.$rootScope.$destroy();
      this.$rootScope = null;
    }
  }
}

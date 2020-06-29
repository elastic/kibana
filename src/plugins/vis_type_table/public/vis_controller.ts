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
import { CoreSetup, PluginInitializerContext } from 'kibana/public';
import angular, { IModule, auto, IRootScopeService, IScope, ICompileService } from 'angular';
import $ from 'jquery';

import { VisParams, ExprVis } from '../../visualizations/public';
import { getAngularModule } from './get_inner_angular';
import { getKibanaLegacy } from './services';
import { initTableVisLegacyModule } from './table_vis_legacy_module';

const innerAngularName = 'kibana/table_vis';

export function getTableVisualizationControllerClass(
  core: CoreSetup,
  context: PluginInitializerContext
) {
  return class TableVisualizationController {
    private tableVisModule: IModule | undefined;
    private injector: auto.IInjectorService | undefined;
    el: JQuery<Element>;
    vis: ExprVis;
    $rootScope: IRootScopeService | null = null;
    $scope: (IScope & { [key: string]: any }) | undefined;
    $compile: ICompileService | undefined;

    constructor(domeElement: Element, vis: ExprVis) {
      this.el = $(domeElement);
      this.vis = vis;
    }

    getInjector() {
      if (!this.injector) {
        const mountpoint = document.createElement('div');
        mountpoint.setAttribute('style', 'height: 100%; width: 100%;');
        this.injector = angular.bootstrap(mountpoint, [innerAngularName]);
        this.el.append(mountpoint);
      }

      return this.injector;
    }

    async initLocalAngular() {
      if (!this.tableVisModule) {
        const [coreStart] = await core.getStartServices();
        this.tableVisModule = getAngularModule(innerAngularName, coreStart, context);
        initTableVisLegacyModule(this.tableVisModule);
      }
    }

    async render(esResponse: object, visParams: VisParams) {
      getKibanaLegacy().loadFontAwesome();
      await this.initLocalAngular();

      return new Promise(async (resolve, reject) => {
        if (!this.$rootScope) {
          const $injector = this.getInjector();
          this.$rootScope = $injector.get('$rootScope');
          this.$compile = $injector.get('$compile');
        }
        const updateScope = () => {
          if (!this.$scope) {
            return;
          }
          this.$scope.vis = this.vis;
          this.$scope.visState = { params: visParams };
          this.$scope.esResponse = esResponse;

          this.$scope.visParams = visParams;
          this.$scope.renderComplete = resolve;
          this.$scope.renderFailed = reject;
          this.$scope.resize = Date.now();
          this.$scope.$apply();
        };

        if (!this.$scope && this.$compile) {
          this.$scope = this.$rootScope.$new();
          this.$scope.uiState = this.vis.getUiState();
          updateScope();
          this.el.find('div').append(this.$compile(this.vis.type!.visConfig.template)(this.$scope));
          this.$scope.$apply();
        } else {
          updateScope();
        }
      });
    }

    destroy() {
      if (this.$rootScope) {
        this.$rootScope.$destroy();
        this.$rootScope = null;
      }
    }
  };
}

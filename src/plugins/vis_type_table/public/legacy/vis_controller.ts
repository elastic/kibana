/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { CoreSetup, PluginInitializerContext } from 'kibana/public';
import angular, { IModule, auto, IRootScopeService, IScope, ICompileService } from 'angular';
import $ from 'jquery';

import './index.scss';

import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { getAngularModule } from './get_inner_angular';
import { initTableVisLegacyModule } from './table_vis_legacy_module';
// @ts-ignore
import tableVisTemplate from './table_vis.html';
import { TablePluginStartDependencies } from '../plugin';
import { TableVisConfig } from '../types';
import { TableContext } from '../table_vis_response_handler';

const innerAngularName = 'kibana/table_vis';

export type TableVisLegacyController = InstanceType<
  ReturnType<typeof getTableVisualizationControllerClass>
>;

export function getTableVisualizationControllerClass(
  core: CoreSetup<TablePluginStartDependencies>,
  context: PluginInitializerContext
) {
  return class TableVisualizationController {
    tableVisModule: IModule | undefined;
    injector: auto.IInjectorService | undefined;
    el: JQuery<Element>;
    $rootScope: IRootScopeService | null = null;
    $scope: (IScope & { [key: string]: any }) | undefined;
    $compile: ICompileService | undefined;

    constructor(domeElement: Element) {
      this.el = $(domeElement);
    }

    getInjector() {
      if (!this.injector) {
        const mountpoint = document.createElement('div');
        mountpoint.className = 'visualization';
        this.injector = angular.bootstrap(mountpoint, [innerAngularName]);
        this.el.append(mountpoint);
      }

      return this.injector;
    }

    async initLocalAngular() {
      if (!this.tableVisModule) {
        const [coreStart, { kibanaLegacy }] = await core.getStartServices();
        this.tableVisModule = getAngularModule(innerAngularName, coreStart, context);
        initTableVisLegacyModule(this.tableVisModule);
        kibanaLegacy.loadFontAwesome();
      }
    }

    async render(
      esResponse: TableContext,
      visParams: TableVisConfig,
      handlers: IInterpreterRenderHandlers
    ): Promise<void> {
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

          this.$scope.visState = { params: visParams, title: visParams.title };
          this.$scope.esResponse = esResponse;

          this.$scope.visParams = visParams;
          this.$scope.renderComplete = resolve;
          this.$scope.renderFailed = reject;
          this.$scope.resize = Date.now();
          this.$scope.$apply();
        };

        if (!this.$scope && this.$compile) {
          this.$scope = this.$rootScope.$new();
          this.$scope.uiState = handlers.uiState;
          this.$scope.filter = handlers.event;
          updateScope();
          this.el.find('div').append(this.$compile(tableVisTemplate)(this.$scope));
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

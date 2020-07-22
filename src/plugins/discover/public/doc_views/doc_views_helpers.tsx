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

import { auto, IController } from 'angular';
import React from 'react';
import { render } from 'react-dom';
import angular, { ICompileService } from 'angular';
import { DocViewRenderProps, AngularScope, AngularDirective } from './doc_views_types';
import { DocViewerError } from '../components/doc_viewer/doc_viewer_render_error';

/**
 * Compiles and injects the give angular template into the given dom node
 * returns a function to cleanup the injected angular element
 */
export async function injectAngularElement(
  domNode: Element,
  template: string,
  scopeProps: DocViewRenderProps,
  Controller: IController,
  getInjector: () => Promise<auto.IInjectorService>
): Promise<() => void> {
  const $injector = await getInjector();
  const rootScope: AngularScope = $injector.get('$rootScope');
  const $compile: ICompileService = $injector.get('$compile');
  const newScope = Object.assign(rootScope.$new(), scopeProps);

  if (typeof Controller === 'function') {
    // when a controller is defined, expose the value it produces to the view as `$ctrl`
    // see: https://docs.angularjs.org/api/ng/provider/$compileProvider#component
    (newScope as any).$ctrl = $injector.instantiate(Controller, {
      $scope: newScope,
    });
  }

  const $target = angular.element(domNode);
  const $element = angular.element(template);

  newScope.$apply(() => {
    const linkFn = $compile($element);
    $target.empty().append($element);
    linkFn(newScope);
  });

  return () => {
    newScope.$destroy();
  };
}
/**
 * Converts a given legacy angular directive to a render function
 * for usage in a react component. Note that the rendering is async
 */
export function convertDirectiveToRenderFn(
  directive: AngularDirective,
  getInjector: () => Promise<auto.IInjectorService>
) {
  return (domNode: Element, props: DocViewRenderProps) => {
    let rejected = false;

    const cleanupFnPromise = injectAngularElement(
      domNode,
      directive.template,
      props,
      directive.controller,
      getInjector
    );
    cleanupFnPromise.catch((e) => {
      rejected = true;
      render(<DocViewerError error={e} />, domNode);
    });

    return () => {
      if (!rejected) {
        // for cleanup
        // http://roubenmeschian.com/rubo/?p=51
        cleanupFnPromise.then((cleanup) => cleanup());
      }
    };
  };
}

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
import angular, { auto, ICompileService, IScope } from 'angular';
import { render } from 'react-dom';
import React, { useRef, useEffect } from 'react';
import { getServices } from '../../../kibana_services';
export type AngularScope = IScope;

export interface AngularDirective {
  template: string;
}

/**
 * Compiles and injects the give angular template into the given dom node
 * returns a function to cleanup the injected angular element
 */
export async function injectAngularElement(
  domNode: Element,
  template: string,
  scopeProps: any,
  getInjector: () => Promise<auto.IInjectorService>
): Promise<() => void> {
  const $injector = await getInjector();
  const rootScope: AngularScope = $injector.get('$rootScope');
  const $compile: ICompileService = $injector.get('$compile');
  const newScope = Object.assign(rootScope.$new(), scopeProps);

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
  return (domNode: Element, props: any) => {
    let rejected = false;

    const cleanupFnPromise = injectAngularElement(domNode, directive.template, props, getInjector);
    cleanupFnPromise.catch((e) => {
      rejected = true;
      render(<div>error</div>, domNode);
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

export function DocTableLegacy(renderProps: any) {
  const renderFn = convertDirectiveToRenderFn(
    {
      template: `<doc-table
                hits="rows"
                index-pattern="indexPattern"
                sorting="sort"
                columns="columns"
                infinite-scroll="true"
                filter="onFilter"
                data-shared-item
                data-title="searchTitle"
                data-description="searchDescription"
                data-test-subj="discoverDocTable"
                minimum-visible-rows="minimumVisibleRows"
                render-complete
                on-add-column="onAddColumn"
                on-change-sort-order="setSortOrder"
                on-move-column="moveColumn"
                on-remove-column="onRemoveColumn"></doc_table>`,
    },
    () => getServices().getEmbeddableInjector()
  );
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref && ref.current) {
      return renderFn(ref.current, renderProps);
    }
  }, [renderFn, renderProps]);
  return <div ref={ref} />;
}

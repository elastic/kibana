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
import { getServices, IIndexPattern } from '../../../kibana_services';
import { IndexPatternField } from '../../../../../data/common/index_patterns';
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
    cleanupFnPromise.catch(() => {
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

export interface DocTableLegacyProps {
  columns: string[];
  searchDescription?: string;
  searchTitle?: string;
  onFilter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  rows: Array<Record<string, unknown>>;
  indexPattern: IIndexPattern;
  minimumVisibleRows: number;
  onAddColumn: (column: string) => void;
  onSort: (sort: string[][]) => void;
  onMoveColumn: (columns: string, newIdx: number) => void;
  onRemoveColumn: (column: string) => void;
  sort?: string[][];
}

export function DocTableLegacy(renderProps: DocTableLegacyProps) {
  const renderFn = convertDirectiveToRenderFn(
    {
      template: `<doc-table
                columns="columns"
                data-description="{{searchDescription}}"
                data-shared-item
                data-test-subj="discoverDocTable"
                data-title="{{searchTitle}}"
                filter="onFilter"
                hits="rows"
                index-pattern="indexPattern"
                infinite-scroll="true"
                minimum-visible-rows="minimumVisibleRows"
                on-add-column="onAddColumn"
                on-change-sort-order="onSort"
                on-move-column="onMoveColumn"
                on-remove-column="onRemoveColumn"
                render-complete
                sorting="sort"></doc_table>`,
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

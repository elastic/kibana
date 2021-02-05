/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import angular, { auto, ICompileService, IScope } from 'angular';
import { render } from 'react-dom';
import React, { useRef, useEffect } from 'react';
import { getServices, IIndexPattern } from '../../../kibana_services';
import { IndexPatternField } from '../../../../../data/common/index_patterns';

export interface DocTableLegacyProps {
  columns: string[];
  searchDescription?: string;
  searchTitle?: string;
  onFilter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  rows: Array<Record<string, unknown>>;
  indexPattern: IIndexPattern;
  minimumVisibleRows: number;
  onAddColumn?: (column: string) => void;
  onSort?: (sort: string[][]) => void;
  onMoveColumn?: (columns: string, newIdx: number) => void;
  onRemoveColumn?: (column: string) => void;
  sort?: string[][];
}
export interface AngularDirective {
  template: string;
}
export type AngularScope = IScope & { renderProps?: DocTableLegacyProps };

/**
 * Compiles and injects the give angular template into the given dom node
 * returns a function to cleanup the injected angular element
 */
export async function injectAngularElement(
  domNode: Element,
  template: string,
  renderProps: any,
  injector: auto.IInjectorService
) {
  const rootScope: IScope = injector.get('$rootScope');
  const $compile: ICompileService = injector.get('$compile');
  const newScope = Object.assign(rootScope.$new(), { renderProps });

  const $target = angular.element(domNode);
  const $element = angular.element(template);

  newScope.$apply(() => {
    const linkFn = $compile($element);
    $target.empty().append($element);
    linkFn(newScope);
  });

  return newScope;
}

function getRenderFn(domNode: Element, props: any) {
  const directive = {
    template: `<doc-table
                columns="renderProps.columns"
                data-description="{{renderProps.searchDescription}}"
                data-shared-item
                data-test-subj="discoverDocTable"
                data-title="{{renderProps.searchTitle}}"
                filter="renderProps.onFilter"
                hits="renderProps.rows"
                index-pattern="renderProps.indexPattern"
                infinite-scroll="true"
                minimum-visible-rows="renderProps.minimumVisibleRows"
                on-add-column="renderProps.onAddColumn"
                on-change-sort-order="renderProps.onSort"
                on-move-column="renderProps.onMoveColumn"
                on-remove-column="renderProps.onRemoveColumn"
                render-complete
                use-new-fields-api="renderProps.useNewFieldsApi"
                sorting="renderProps.sort"></doc_table>`,
  };

  return async () => {
    try {
      const injector = await getServices().getEmbeddableInjector();
      return await injectAngularElement(domNode, directive.template, props, injector);
    } catch (e) {
      render(<div>error</div>, domNode);
    }
  };
}

export function DocTableLegacy(renderProps: DocTableLegacyProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scope = useRef<AngularScope | undefined>();

  useEffect(() => {
    if (ref && ref.current && !scope.current) {
      const fn = getRenderFn(ref.current, renderProps);
      fn().then((newScope) => {
        scope.current = newScope;
      });
    } else if (scope && scope.current) {
      scope.current.renderProps = renderProps;
      scope.current.$apply();
    }
  }, [renderProps]);
  useEffect(() => {
    return () => {
      if (scope.current) {
        scope.current.$destroy();
      }
    };
  }, []);
  return (
    <div>
      <div ref={ref} />
    </div>
  );
}

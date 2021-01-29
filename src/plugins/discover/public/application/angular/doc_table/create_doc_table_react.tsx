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
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
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
  injector: auto.IInjectorService
) {
  const rootScope: AngularScope = injector.get('$rootScope');
  const $compile: ICompileService = injector.get('$compile');
  const newScope = Object.assign(rootScope.$new(), scopeProps);

  const $target = angular.element(domNode);
  const $element = angular.element(template);

  newScope.$apply(() => {
    const linkFn = $compile($element);
    $target.empty().append($element);
    linkFn(newScope);
  });

  return newScope;
}

export interface DocTableLegacyProps {
  columns: string[];
  searchDescription?: string;
  searchTitle?: string;
  onFilter: (field: IndexPatternField | string, value: string, type: '+' | '-') => void;
  rows: Array<Record<string, unknown>>;
  indexPattern: IIndexPattern;
  minimumVisibleRows: number;
  onAddColumn?: (column: string) => void;
  onBackToTop: () => void;
  onSort?: (sort: string[][]) => void;
  onMoveColumn?: (columns: string, newIdx: number) => void;
  onRemoveColumn?: (column: string) => void;
  sampleSize: number;
  sort?: string[][];
  useNewFieldsApi?: boolean;
}

function getRenderFn(domNode: Element, props: any) {
  const directive = {
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
                use-new-fields-api="useNewFieldsApi"
                sorting="sort"></doc_table>`,
  };

  return async () => {
    try {
      const injector = await getServices().getEmbeddableInjector();
      return await injectAngularElement(domNode, directive.template, props, injector);
    } catch (e) {
      render(<div>error</div>, domNode);
      return () => void 0;
    }
  };
}

export function DocTableLegacy(renderProps: DocTableLegacyProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scope = useRef<AngularScope>();

  useEffect(() => {
    if (ref && ref.current && !scope.current) {
      const fn = getRenderFn(ref.current, renderProps);
      fn().then((newScope) => {
        scope.current = newScope;
      });
    } else if (scope && scope.current) {
      scope.current = Object.assign(scope.current, renderProps);
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
      {renderProps.rows.length === renderProps.sampleSize ? (
        <div
          className="dscTable__footer"
          data-test-subj="discoverDocTableFooter"
          tabIndex={-1}
          id="discoverBottomMarker"
        >
          <FormattedMessage
            id="discover.howToSeeOtherMatchingDocumentsDescription"
            defaultMessage="These are the first {sampleSize} documents matching
                  your search, refine your search to see others."
            values={{ sampleSize: renderProps.sampleSize }}
          />
          <EuiButtonEmpty onClick={renderProps.onBackToTop}>
            <FormattedMessage id="discover.backToTopLinkText" defaultMessage="Back to top." />
          </EuiButtonEmpty>
        </div>
      ) : (
        <span tabIndex={-1} id="discoverBottomMarker">
          &#8203;
        </span>
      )}
    </div>
  );
}

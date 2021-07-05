/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import angular, { auto, ICompileService, IScope } from 'angular';
import { render } from 'react-dom';
import React, { useRef, useEffect, useState, useCallback, memo } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { getServices, IndexPattern } from '../../../kibana_services';
import { SkipBottomButton } from '../../apps/main/components/skip_bottom_button';
import { DocTable } from './doc_table_component';
import { SortOrder } from './components/table_header/helpers';
import { DocTableRow } from './components/table_row/table_row';
import { DocViewFilterFn } from '../../doc_views/doc_views_types';

export interface DocTableLegacyProps {
  columns: string[];
  searchDescription?: string;
  searchTitle?: string;
  onFilter: DocViewFilterFn;
  rows: DocTableRow[];
  indexPattern: IndexPattern;
  minimumVisibleRows?: number;
  onAddColumn?: (column: string) => void;
  onBackToTop: () => void;
  onSort?: (sort: string[][]) => void;
  onMoveColumn?: (columns: string, newIdx: number) => void;
  onRemoveColumn?: (column: string) => void;
  sampleSize: number;
  sort: SortOrder[];
  useNewFieldsApi?: boolean;
  totalHitCount?: number;
  isLoading?: boolean;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getRenderFn(domNode: Element, props: any) {
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

const DocTableMemoized = memo(DocTable);

export function DocTableLegacy(renderProps: DocTableLegacyProps) {
  const ref = useRef<HTMLDivElement>(null);
  const scope = useRef<AngularScope | undefined>();
  const [rows, setRows] = useState(renderProps.rows);
  const [minimumVisibleRows, setMinimumVisibleRows] = useState(50);
  const onSkipBottomButtonClick = useCallback(async () => {
    // delay scrolling to after the rows have been rendered
    const bottomMarker = document.getElementById('discoverBottomMarker');
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    // show all the rows
    setMinimumVisibleRows(renderProps.rows.length);

    while (renderProps.rows.length !== document.getElementsByClassName('kbnDocTable__row').length) {
      await wait(50);
    }
    bottomMarker!.focus();
    await wait(50);
    bottomMarker!.blur();
  }, [setMinimumVisibleRows, renderProps.rows]);

  useEffect(() => {
    setMinimumVisibleRows(50);
    setRows(renderProps.rows);
  }, [renderProps.rows, setMinimumVisibleRows]);

  useEffect(() => {
    if (ref && ref.current && !scope.current) {
      const fn = getRenderFn(ref.current, { ...renderProps, rows, minimumVisibleRows });
      fn().then((newScope) => {
        scope.current = newScope;
      });
    } else if (scope && scope.current) {
      scope.current.renderProps = { ...renderProps, rows, minimumVisibleRows };
      scope.current.$applyAsync();
    }
  }, [renderProps, minimumVisibleRows, rows]);

  useEffect(() => {
    return () => {
      if (scope.current) {
        scope.current.$destroy();
      }
    };
  }, []);
  return (
    <div>
      <SkipBottomButton onClick={onSkipBottomButtonClick} />
      <DocTableMemoized
        columns={renderProps.columns}
        rows={renderProps.rows}
        minimumVisibleRows={renderProps.minimumVisibleRows}
        infiniteScroll={true}
        totalHitCount={renderProps.totalHitCount}
        isLoading={renderProps.isLoading}
        indexPattern={renderProps.indexPattern}
        onSort={renderProps.onSort}
        onAddColumn={renderProps.onAddColumn}
        onMoveColumn={renderProps.onMoveColumn}
        onRemoveColumn={renderProps.onRemoveColumn}
        sorting={renderProps.sort}
        filter={renderProps.onFilter}
        useNewFieldsApi={renderProps.useNewFieldsApi}
      />
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
          <EuiButtonEmpty onClick={renderProps.onBackToTop} data-test-subj="discoverBackToTop">
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

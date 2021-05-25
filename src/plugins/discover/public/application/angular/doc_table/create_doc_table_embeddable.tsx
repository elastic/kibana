/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { render } from 'react-dom';
import React, { useRef, useEffect, useState } from 'react';
import { I18nProvider } from '@kbn/i18n/react';
import { getServices } from '../../../kibana_services';
import { AngularScope, DocTableLegacyProps, injectAngularElement } from './create_doc_table_react';

export interface DocTableEmbeddableProps extends Partial<DocTableLegacyProps> {
  refs: HTMLElement;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getRenderFn(domNode: Element, props: any) {
  const directive = {
    template: `<doc-table
        class="panel-content"
        columns="renderProps.columns"
        data-description="{{renderProps.searchDescription}}"
        data-shared-item
        data-test-subj="embeddedSavedSearchDocTable"
        data-title="{{renderProps.sharedItemTitle}}"
        filter="renderProps.onFilter"
        hits="renderProps.rows"
        index-pattern="renderProps.indexPattern"
        is-loading="renderProps.isLoading"
        on-add-column="renderProps.onAddColumn"
        on-change-sort-order="renderProps.onSort"
        on-move-column="renderProps.onMoveColumn"
        on-remove-column="renderProps.onRemoveColumn"
        render-complete
        sorting="renderProps.sort"
        total-hit-count="renderProps.totalHitCount"
        use-new-fields-api="renderProps.useNewFieldsApi"</doc-table>`,
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

export function DiscoverDocTableEmbeddable(props: DocTableEmbeddableProps) {
  return (
    <I18nProvider>
      <DocTableLegacyInner {...props} />
    </I18nProvider>
  );
}

function DocTableLegacyInner(renderProps: DocTableEmbeddableProps) {
  const scope = useRef<AngularScope | undefined>();
  const [rows, setRows] = useState(renderProps.rows);
  const [minimumVisibleRows, setMinimumVisibleRows] = useState(50);

  useEffect(() => {
    if (minimumVisibleRows > 50) {
      setMinimumVisibleRows(50);
    }
    setRows(renderProps.rows);
  }, [renderProps.rows, minimumVisibleRows, setMinimumVisibleRows]);

  useEffect(() => {
    if (renderProps.refs) {
      const fn = getRenderFn(renderProps.refs, {
        ...renderProps,
        rows,
        minimumVisibleRows,
      });
      fn().then((newScope) => {
        scope.current = newScope;
      });
    }
  }, [renderProps, minimumVisibleRows, rows]);

  useEffect(() => {
    return () => {
      if (scope.current) {
        scope.current.$destroy();
      }
    };
  }, []);
  return <React.Fragment />;
}

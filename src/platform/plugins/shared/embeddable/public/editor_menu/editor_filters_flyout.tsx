/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
} from '@elastic/eui';
import type { DataView } from '@kbn/data-views-plugin/public';
import { isOfQueryType, type Filter, type Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import {
  apiPublishesDataViews,
  apiPublishesWritableUnifiedSearch,
  useStateFromPublishingSubject,
} from '@kbn/presentation-publishing';
import { PanelLevelFilters } from '@kbn/unified-search-plugin/public';
import type { EditorFiltersBodyProps } from './types';

const readQuery = (api: unknown): Query | undefined => {
  if (!apiPublishesWritableUnifiedSearch(api)) return undefined;
  const published = api.query$.getValue();
  return isOfQueryType(published) ? published : undefined;
};

export const EditorFiltersFlyout = ({
  api,
  closeFlyout,
  menuManager,
}: EditorFiltersBodyProps): React.ReactElement => {
  const [query, setQuery] = useState<Query | undefined>(() => readQuery(api));
  const [filters, setFilters] = useState<Filter[]>(() =>
    apiPublishesWritableUnifiedSearch(api) ? api.filters$.getValue() ?? [] : []
  );
  const fallbackDataViews$ = useMemo(
    () => new BehaviorSubject<DataView[] | undefined>(undefined),
    []
  );
  const dataViews$ = apiPublishesDataViews(api) ? api.dataViews$ : fallbackDataViews$;
  const dataViews = useStateFromPublishingSubject(dataViews$) ?? [];

  useEffect(() => {
    const editor = document.getElementById(menuManager.flyoutId);
    editor?.setAttribute('inert', '');
    editor?.setAttribute('aria-hidden', 'true');
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeFlyout();
      }
    };
    const onOutsidePointer = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      const filtersFlyout = document.getElementById(`${menuManager.flyoutId}-filters`);
      if (filtersFlyout?.contains(target)) return;
      // Query suggestions and the filter editor render in an EUI portal outside the flyout.
      if (target instanceof Element && target.closest('[data-euiportal="true"]')) return;
      event.stopImmediatePropagation();
    };
    const pointerEvents = ['mousedown', 'mouseup', 'click', 'touchstart', 'touchend'] as const;
    pointerEvents.forEach((event) => window.addEventListener(event, onOutsidePointer, true));
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      pointerEvents.forEach((event) => window.removeEventListener(event, onOutsidePointer, true));
      window.removeEventListener('keydown', onKeyDown, true);
      editor?.removeAttribute('inert');
      editor?.removeAttribute('aria-hidden');
      menuManager.returnToEditor();
    };
  }, [closeFlyout, menuManager]);

  const save = () => {
    if (apiPublishesWritableUnifiedSearch(api)) {
      api.setQuery(query);
      api.setFilters(filters.length > 0 ? filters : undefined);
    }
    closeFlyout();
  };

  return (
    <>
      <EuiFlyoutBody data-test-subj="editorFiltersFlyoutBody">
        <PanelLevelFilters
          query={query}
          filters={filters}
          dataViews={dataViews}
          onQueryChange={setQuery}
          onFiltersChange={setFilters}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty onClick={closeFlyout} data-test-subj="editorFiltersFlyoutCancel">
              {i18n.translate('embeddableApi.editorMenu.cancelFiltersButtonLabel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton fill onClick={save} data-test-subj="editorFiltersFlyoutSave">
              {i18n.translate('embeddableApi.editorMenu.saveFiltersButtonLabel', {
                defaultMessage: 'Save',
              })}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};

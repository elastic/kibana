/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, {
  Children,
  isValidElement,
  useMemo,
  useCallback,
  useState,
  type ReactNode,
  type ReactElement,
} from 'react';
import { EuiSearchBar, type EuiSearchBarOnChangeArgs } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  useContentListConfig,
  useContentListItems,
  useContentListSearch,
  useContentListSelection,
  useFilterDisplay,
} from '@kbn/content-list-provider';
import { Filters } from './filters/markers';
import { parseFiltersFromChildren, DEFAULT_FILTER_ORDER } from './filters/parse_children';
import { buildSearchBarFilters } from './filters/build_filters';
import { SelectionActions } from './selection_actions/selection_actions';
import {
  parseSelectionActionsFromChildren,
  type ActionDescriptor,
} from './selection_actions/parse_children';
import { SelectionActionsRenderer } from './selection_actions/build_actions';
import { CreateButton } from './global_actions';

const i18nTexts = {
  defaultPlaceholder: i18n.translate('contentManagement.contentList.toolbar.searchPlaceholder', {
    defaultMessage: 'Search...',
  }),
};

/**
 * Props for the {@link ContentListToolbar} component.
 */
export interface ContentListToolbarProps {
  /** Optional children for declarative configuration via {@link Filters} and {@link SelectionActions}. */
  children?: ReactNode;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Gets the default selection actions based on the provider configuration.
 *
 * @param config - The configuration object returned from {@link useContentListConfig}.
 * @returns An array of {@link ActionDescriptor} objects representing the default actions.
 */
const getDefaultSelectionActions = (
  config: ReturnType<typeof useContentListConfig>
): ActionDescriptor[] => {
  const actions: ActionDescriptor[] = [];

  if (config.features.selection?.onSelectionDelete) {
    actions.push({
      id: 'delete',
      config: {},
    });
  }

  if (config.features.selection?.onSelectionExport) {
    actions.push({
      id: 'export',
      config: {},
    });
  }

  return actions;
};

/**
 * `ContentListToolbar` component.
 *
 * Provides a unified search and filter toolbar using `EuiSearchBar`.
 * Supports declarative configuration of filters and selection actions via compound components.
 *
 * **Smart Defaults**: When no children are provided, auto-renders filters and actions
 * based on provider configuration.
 *
 * **Declarative Configuration**: Use {@link Filters} and {@link SelectionActions} children
 * to customize filter order and available actions.
 *
 * @param props - The component props. See {@link ContentListToolbarProps}.
 * @returns A React element containing the toolbar.
 *
 * @example
 * ```tsx
 * const { Filters, SelectionActions } = ContentListToolbar;
 *
 * // Smart defaults - auto-renders based on provider config.
 * <ContentListToolbar />
 *
 * // Custom filter order and selection actions.
 * <ContentListToolbar>
 *   <SelectionActions>
 *     <SelectionActions.Delete />
 *     <SelectionActions.Export />
 *     <SelectionActions.Action id="archive" label="Archive" onSelect={handleArchive} />
 *   </SelectionActions>
 *   <Filters>
 *     <Filters.Starred />
 *     <Filters.Sort />
 *     <Filters.Tags tagManagementUrl="/app/tags" />
 *     <Filters.CreatedBy />
 *     <Filters.Filter field="status" />
 *   </Filters>
 * </ContentListToolbar>
 * ```
 */
export const ContentListToolbar = ({
  children,
  'data-test-subj': dataTestSubj = 'contentListToolbar',
}: ContentListToolbarProps) => {
  const config = useContentListConfig();
  const filterDisplay = useFilterDisplay();
  const { isLoading } = useContentListItems();
  const { queryText, setSearch, clearSearch } = useContentListSearch();
  const { selectedCount } = useContentListSelection();

  // Track query validity for visual feedback.
  const [hasQueryError, setHasQueryError] = useState(false);

  // Find <Filters> child using direct identity check.
  const filtersChild = useMemo(() => {
    return Children.toArray(children).find(
      (child) => isValidElement(child) && child.type === Filters
    ) as ReactElement | undefined;
  }, [children]);

  // Find <SelectionActions> child using direct identity check.
  const selectionActionsChild = useMemo(() => {
    return Children.toArray(children).find(
      (child) => isValidElement(child) && child.type === SelectionActions
    ) as ReactElement | undefined;
  }, [children]);

  // Parse filter configuration from children.
  // Note: filterProps is currently unused but parsed for future use (e.g., tagManagementUrl).
  const [filterIds] = useMemo(() => {
    if (!filtersChild) {
      // Default filter order when no <Filters> provided.
      return [DEFAULT_FILTER_ORDER, {}];
    }
    return parseFiltersFromChildren(filtersChild.props.children);
  }, [filtersChild]);

  // Parse selection action configuration from children.
  const actionConfigs = useMemo(() => {
    if (!selectionActionsChild) {
      // Default actions when no <SelectionActions> provided.
      return getDefaultSelectionActions(config);
    }
    return parseSelectionActionsFromChildren(selectionActionsChild.props.children);
  }, [selectionActionsChild, config]);

  // Build EuiSearchBar filter configurations.
  const filters = useMemo(
    () => buildSearchBarFilters(filterIds, { config, filterDisplay }),
    [filterIds, config, filterDisplay]
  );

  // Build recognized fields for schema (base + custom filter fields).
  const recognizedFields = useMemo(() => {
    const base = ['tag', 'starred', 'createdBy'];
    const filteringConfig =
      typeof config.features.filtering === 'object' ? config.features.filtering : undefined;
    const customFields = Object.keys(filteringConfig?.custom ?? {});
    return [...base, ...customFields];
  }, [config.features.filtering]);

  // Handle search bar changes.
  const handleChange = useCallback(
    ({ query, error }: EuiSearchBarOnChangeArgs) => {
      if (error) {
        // Mark query as invalid but don't send to server.
        setHasQueryError(true);
        return;
      }

      setHasQueryError(false);

      // EuiSearchBar returns a Query object, convert to string for storage.
      const newQueryText = query?.text ?? '';
      if (newQueryText === '') {
        clearSearch();
      } else {
        setSearch(newQueryText);
      }
    },
    [setSearch, clearSearch]
  );

  // Get placeholder from config.
  const placeholder = useMemo(() => {
    if (typeof config.features.search === 'object' && config.features.search.placeholder) {
      return config.features.search.placeholder;
    }
    return i18nTexts.defaultPlaceholder;
  }, [config.features.search]);

  // Only show selection actions when items are selected.
  const toolsLeft =
    selectedCount > 0 ? <SelectionActionsRenderer actions={actionConfigs} /> : undefined;

  // Render create button when globalActions.onCreate is configured.
  const toolsRight = config.features.globalActions?.onCreate ? <CreateButton /> : undefined;

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiSearchBar
        query={queryText}
        toolsLeft={toolsLeft}
        toolsRight={toolsRight}
        filters={filters}
        box={{
          placeholder,
          incremental: true,
          isLoading,
          'data-test-subj': 'contentListSearchBox',
          schema: {
            recognizedFields,
          },
          isInvalid: hasQueryError,
        }}
        onChange={handleChange}
      />
    </div>
  );
};

// Note: Compound components are attached via Object.assign in index.ts.

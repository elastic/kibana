/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiFormRowProps } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  withEuiTheme,
  EuiTextColor,
  EuiLink,
  EuiSkeletonText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  type Filter,
  BooleanRelation,
  buildCombinedFilter,
  buildCustomFilter,
  buildEmptyFilter,
  FILTERS,
  filterToQueryDsl,
  getFilterParams,
  isCombinedFilter,
} from '@kbn/es-query';
import { merge } from 'lodash';
import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { XJsonLang } from '@kbn/monaco';
import type { DataViewsContract } from '@kbn/data-views-plugin/public';
import { getIndexPatternFromFilter } from '@kbn/data-plugin/public';
import { CodeEditor } from '@kbn/code-editor';
import { cx } from '@emotion/css';
import type { WithEuiThemeProps } from '@elastic/eui/src/services/theme';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import type { SuggestionsAbstraction } from '@kbn/kql/public';
import { Subject } from 'rxjs';
import type { FilterableSource } from '@kbn/data-source';
import { isEsqlFilterableSource } from '@kbn/data-source';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { GenericComboBox } from './generic_combo_box';
import {
  getFieldFromFilter,
  getFilterableFields,
  getOperatorFromFilter,
  isFilterValid,
} from './lib/filter_editor_utils';
import { FiltersBuilder } from '../../filters_builder';
import { FilterBadgeGroup } from '../../filter_badge/filter_badge_group';
import { MIDDLE_TRUNCATION_PROPS, SINGLE_SELECTION_AS_TEXT_PROPS } from './lib/helpers';
import { flattenFilters } from '../lib/flatten_filters';
import { getFilterKeys } from '../filter_item/is_filter_applicable';
import { filterBadgeStyle, filterPreviewLabelStyle } from './filter_editor.styles';
import { ScrollableContainer } from './scrollable_container';

const editorFormStyle = css({ padding: euiThemeVars.euiSizeM });

const getDataViewName = (dataView?: FilterableSource): string =>
  dataView?.getName?.() ?? dataView?.name ?? dataView?.title ?? '';

/** Points a filter, and the nested filters of a combined one, from one data view to another. */
const rebindFilterDataView = (filter: Filter, fromId?: string, toId?: string): Filter => ({
  ...filter,
  meta: {
    ...filter.meta,
    ...(filter.meta.index === fromId && { index: toId }),
    ...(isCombinedFilter(filter) && {
      params: filter.meta.params.map((nested) => rebindFilterDataView(nested, fromId, toId)),
    }),
  },
});

export const strings = {
  getPanelTitleAdd: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.addFilterPopupTitle', {
      defaultMessage: 'Add filter',
    }),
  getPanelTitleEdit: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.editFilterPopupTitle', {
      defaultMessage: 'Edit filter',
    }),

  getAddButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.addButtonLabel', {
      defaultMessage: 'Add filter',
    }),
  getUpdateButtonLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.updateButtonLabel', {
      defaultMessage: 'Update filter',
    }),
  getSelectDataViewToolTip: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.chooseDataViewFirstToolTip', {
      defaultMessage: 'You need to select a data view first',
    }),
  getCustomLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.createCustomLabelInputLabel', {
      defaultMessage: 'Custom label (optional)',
    }),
  getAddCustomLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.customLabelPlaceholder', {
      defaultMessage: 'Add a custom label here',
    }),
  getSelectDataView: () =>
    i18n.translate('unifiedSearch.filter.filterBar.indexPatternSelectPlaceholder', {
      defaultMessage: 'Select a data view',
    }),
  getDataView: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.dateViewSelectLabel', {
      defaultMessage: 'Data view',
    }),
  getRecoveredDataViewNotice: (dataViewName: string) =>
    i18n.translate('unifiedSearch.filter.filterEditor.recoveredDataViewNotice', {
      defaultMessage:
        "This filter's data view isn't available, so {dataViewName} was selected because it has the filter's fields.",
      values: { dataViewName },
    }),
  getQueryDslLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.queryDslLabel', {
      defaultMessage: 'Elasticsearch Query DSL',
    }),
  getQueryDslDocsLinkLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.queryDslDocsLinkLabel', {
      defaultMessage: 'Learn about Query DSL syntax',
    }),
  getQueryDslAriaLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.queryDslAriaLabel', {
      defaultMessage: 'Elasticsearch Query DSL editor',
    }),
  getSpatialFilterQueryDslHelpText: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.spatialFilterQueryDslHelpText', {
      defaultMessage:
        'Editing Elasticsearch Query DSL prevents filter geometry from displaying in map.',
    }),
};

interface QueryDslFilter {
  queryDsl: string;
  customLabel: string | null;
  /** The data view ID the filter is saved with, which the data view picker can change. */
  dataViewId?: string;
}

export interface FilterEditorComponentProps {
  filter: Filter;
  indexPatterns: FilterableSource[];
  onSubmit: (filter: Filter) => void;
  onCancel: () => void;
  onLocalFilterCreate?: (initialState: { filter: Filter; queryDslFilter: QueryDslFilter }) => void;
  onLocalFilterUpdate?: (filter: Filter | QueryDslFilter) => void;
  timeRangeForSuggestionsOverride?: boolean;
  filtersForSuggestions?: Filter[];
  mode?: 'edit' | 'add';
  suggestionsAbstraction?: SuggestionsAbstraction;
  docLinks: DocLinksStart;
  filtersCount?: number;
  dataViews?: DataViewsContract;
}

export type FilterEditorProps = WithEuiThemeProps & FilterEditorComponentProps;

interface State {
  indexPatterns: FilterableSource[];
  selectedDataView?: FilterableSource;
  customLabel: string | null;
  queryDsl: string;
  isCustomEditorOpen: boolean;
  localFilter: Filter;
  isLoadingDataView?: boolean;
  resetVisibleHeight$: Subject<void>;
  /** Set when the filter's data view isn't available and another one was selected, by its fields or in the picker. */
  useSelectedDataViewOnSubmit: boolean;
  /** The data view selected by the filter's fields, to notify the user about the swap. */
  dataViewSelectedByFields?: FilterableSource;
}

class FilterEditorComponent extends Component<FilterEditorProps, State> {
  /** Aborted on unmount, so a data view that loads after the editor closed is ignored. */
  private readonly unmountController = new AbortController();

  constructor(props: FilterEditorProps) {
    super(props);
    const dataView = getIndexPatternFromFilter(props.filter, props.indexPatterns);
    this.state = {
      indexPatterns: props.indexPatterns,
      selectedDataView: dataView,
      customLabel: props.filter.meta.alias || '',
      queryDsl: this.parseFilterToQueryDsl(props.filter, props.indexPatterns),
      isCustomEditorOpen: this.isUnknownFilterType() || !!this.props.filter?.meta.isMultiIndex,
      localFilter: dataView ? merge({}, props.filter) : buildEmptyFilter(false),
      isLoadingDataView: !Boolean(dataView),
      resetVisibleHeight$: new Subject(),
      useSelectedDataViewOnSubmit: false,
    };
  }

  componentDidMount() {
    const { localFilter, selectedDataView } = this.state;
    this.props.onLocalFilterCreate?.({
      filter: localFilter,
      queryDslFilter: this.getQueryDslFilter(),
    });
    this.props.onLocalFilterUpdate?.(localFilter);
    if (selectedDataView) return;

    const dataViewId = this.props.filter.meta.index;
    if (!dataViewId) {
      this.selectDataViewByFields();
    } else if (!this.props.dataViews) {
      // Without the data views service it's unknown whether the data view exists, so keep its ID.
      this.showFilterAsQueryDsl();
    } else {
      this.loadDataView(dataViewId, this.props.dataViews);
    }
  }

  componentWillUnmount() {
    this.unmountController.abort();
  }

  /**
   * Helper function to load the data view from the index pattern id
   * E.g. in Discover there's just one active data view, so filters with different data view id
   * Than the currently selected data view need to load the data view from the id to display the filter
   * correctly
   * @param dataViewId
   * @internal
   */
  private async loadDataView(dataViewId: string, dataViews: DataViewsContract) {
    const { signal } = this.unmountController;
    try {
      const dataView = await dataViews.get(dataViewId, false);
      if (signal.aborted) return;
      this.setState({
        selectedDataView: dataView,
        isLoadingDataView: false,
        indexPatterns: [dataView, ...this.props.indexPatterns],
        localFilter: merge({}, this.props.filter),
        queryDsl: this.parseFilterToQueryDsl(this.props.filter, this.state.indexPatterns),
      });
    } catch (e) {
      if (signal.aborted) return;
      if (e instanceof SavedObjectNotFound) {
        this.selectDataViewByFields();
      } else {
        // The data view may still exist (e.g. a network or permission error), so keep its ID.
        this.showFilterAsQueryDsl();
      }
    }
  }

  private showFilterAsQueryDsl() {
    this.props.onLocalFilterUpdate?.(this.getQueryDslFilter());
    this.setState({ isLoadingDataView: false, isCustomEditorOpen: true });
  }

  /**
   * When the filter's data view isn't available (e.g. its ID changed or it has none), selects a
   * provided data view that has all of the filter's fields, so the filter stays editable and is
   * saved with that ID. Without a match, the filter is shown as Query DSL instead of an empty one.
   */
  private selectDataViewByFields() {
    const { filter, indexPatterns, onLocalFilterCreate, onLocalFilterUpdate } = this.props;
    const keys = getFilterKeys(filter);
    if (keys.length === 0) {
      this.setState({ isLoadingDataView: false });
      return;
    }

    // ES|QL sources and sources without an ID can't be referenced as the filter's data view.
    const dataView = indexPatterns.find((indexPattern) => {
      if (!indexPattern.id || isEsqlFilterableSource(indexPattern)) return false;
      const filterableFields = getFilterableFields(indexPattern);
      return keys.every((key) => filterableFields.some(({ name }) => name === key));
    });
    if (!dataView) {
      this.showFilterAsQueryDsl();
      return;
    }

    const localFilter = merge({}, rebindFilterDataView(filter, filter.meta.index, dataView.id));
    // The recovered filter is the baseline for the discard-changes check, not a user edit.
    onLocalFilterCreate?.({
      filter: localFilter,
      queryDslFilter: this.getQueryDslFilter({ dataViewId: dataView.id }),
    });
    onLocalFilterUpdate?.(localFilter);
    this.setState({
      selectedDataView: dataView,
      isLoadingDataView: false,
      localFilter,
      useSelectedDataViewOnSubmit: true,
      dataViewSelectedByFields: dataView,
    });
  }

  private parseFilterToQueryDsl(filter: Filter, indexPatterns: FilterableSource[]) {
    const dsl = filterToQueryDsl(filter, indexPatterns);
    return JSON.stringify(dsl, null, 2);
  }

  public render() {
    const toggleEditorFlexItem = this.props.filter?.meta.isMultiIndex ? null : (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty size="xs" data-test-subj="editQueryDSL" onClick={this.toggleCustomEditor}>
          {this.state.isCustomEditorOpen ? (
            <FormattedMessage
              id="unifiedSearch.filter.filterEditor.editFilterValuesButtonLabel"
              defaultMessage="Edit filter values"
            />
          ) : (
            <FormattedMessage
              id="unifiedSearch.filter.filterEditor.editQueryDslButtonLabel"
              defaultMessage="Edit as Query DSL"
            />
          )}
        </EuiButtonEmpty>
      </EuiFlexItem>
    );

    return (
      <ScrollableContainer resetVisibleHeight$={this.state.resetVisibleHeight$}>
        <EuiPopoverTitle paddingSize="s">
          <EuiFlexGroup alignItems="baseline" responsive={false}>
            <EuiFlexItem>
              {this.props.mode === 'add' ? strings.getPanelTitleAdd() : strings.getPanelTitleEdit()}
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="filterEditor__hiddenItem" />
            {toggleEditorFlexItem}
          </EuiFlexGroup>
        </EuiPopoverTitle>

        <EuiSkeletonText lines={3} isLoading={this.state.isLoadingDataView}>
          <EuiForm>
            <div css={editorFormStyle}>
              {this.renderIndexPatternInput()}

              {this.state.isCustomEditorOpen
                ? this.renderCustomEditor()
                : this.renderFiltersBuilderEditor()}

              <EuiSpacer size="l" />
              <EuiFormRow label={strings.getCustomLabel()} fullWidth>
                <EuiFieldText
                  value={`${this.state.customLabel}`}
                  onChange={this.onCustomLabelChange}
                  placeholder={strings.getAddCustomLabel()}
                  fullWidth
                  compressed
                />
              </EuiFormRow>
            </div>
          </EuiForm>
        </EuiSkeletonText>

        <EuiPopoverFooter paddingSize="s">
          {/* Adding isolation here fixes this bug https://github.com/elastic/kibana/issues/142211 */}
          <EuiFlexGroup
            direction="rowReverse"
            alignItems="center"
            css={{ isolation: 'isolate' }}
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiButton
                fill
                onClick={this.onSubmit}
                isDisabled={!this.isFilterValid() || this.state.isLoadingDataView}
                data-test-subj="saveFilter"
                size="s"
              >
                {this.props.mode === 'add'
                  ? strings.getAddButtonLabel()
                  : strings.getUpdateButtonLabel()}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                flush="right"
                onClick={this.props.onCancel}
                data-test-subj="cancelSaveFilter"
                size="s"
              >
                <FormattedMessage
                  id="unifiedSearch.filter.filterEditor.cancelButtonLabel"
                  defaultMessage="Cancel"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem />
          </EuiFlexGroup>
        </EuiPopoverFooter>
      </ScrollableContainer>
    );
  }

  private renderIndexPatternInput() {
    if (this.props.filter?.meta.isMultiIndex) {
      // Don't render index pattern selector if filter supports multiple index patterns
      return null;
    }

    if (
      this.state.indexPatterns.length <= 1 &&
      this.state.indexPatterns.find(
        (indexPattern) => indexPattern === this.getIndexPatternFromFilter()
      )
    ) {
      /**
       * Don't render the index pattern selector if there's just one \ zero index patterns
       * and if the index pattern the filter was LOADED with is in the indexPatterns list.
       **/

      return null;
    }
    const { selectedDataView, dataViewSelectedByFields } = this.state;

    return (
      <>
        <EuiFormRow fullWidth label={strings.getDataView()}>
          <GenericComboBox
            fullWidth
            placeholder={strings.getSelectDataView()}
            options={this.state.indexPatterns}
            selectedOptions={selectedDataView ? [selectedDataView] : []}
            getLabel={getDataViewName}
            onChange={this.onIndexPatternChange}
            isClearable={false}
            data-test-subj="filterIndexPatternsSelect"
            singleSelection={SINGLE_SELECTION_AS_TEXT_PROPS}
            truncationProps={MIDDLE_TRUNCATION_PROPS}
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
        {dataViewSelectedByFields && dataViewSelectedByFields === selectedDataView && (
          <>
            <KbnWarningCallout
              size="s"
              title={strings.getRecoveredDataViewNotice(getDataViewName(dataViewSelectedByFields))}
              data-test-subj="filterEditorRecoveredDataViewNotice"
            />
            <EuiSpacer size="s" />
          </>
        )}
      </>
    );
  }

  private hasCombinedFilterCustomType(filters: Filter[]) {
    return filters.some((filter) => filter.meta.type === 'custom');
  }

  private renderFiltersBuilderEditor() {
    const { selectedDataView, localFilter } = this.state;
    const flattenedFilters = flattenFilters([localFilter]);

    const shouldShowPreview =
      selectedDataView &&
      ((flattenedFilters.length > 1 && !this.hasCombinedFilterCustomType(flattenedFilters)) ||
        (flattenedFilters.length === 1 &&
          isFilterValid(
            selectedDataView,
            getFieldFromFilter(flattenedFilters[0], selectedDataView),
            getOperatorFromFilter(flattenedFilters[0]),
            getFilterParams(flattenedFilters[0])
          )));

    return (
      <>
        <div role="region" aria-label="">
          <EuiToolTip
            position="top"
            content={selectedDataView ? '' : strings.getSelectDataViewToolTip()}
            display="block"
          >
            <FiltersBuilder
              filters={[localFilter]}
              timeRangeForSuggestionsOverride={this.props.timeRangeForSuggestionsOverride}
              filtersForSuggestions={this.props.filtersForSuggestions}
              dataView={selectedDataView!}
              onChange={this.onLocalFilterChange}
              disabled={!selectedDataView}
              suggestionsAbstraction={this.props.suggestionsAbstraction}
              filtersCount={this.props.filtersCount}
            />
          </EuiToolTip>
        </div>

        {shouldShowPreview ? (
          <EuiFormRow
            fullWidth
            hasEmptyLabelSpace={true}
            className={cx(filterBadgeStyle, filterPreviewLabelStyle)}
            label={
              <strong>
                <FormattedMessage
                  id="unifiedSearch.filter.filterBar.preview"
                  defaultMessage="{icon} Preview"
                  values={{
                    icon: <EuiIcon type="inspect" size="s" aria-hidden={true} />,
                  }}
                />
              </strong>
            }
          >
            <EuiText size="xs" data-test-subj="filter-preview" css={{ overflowWrap: 'break-word' }}>
              <FilterBadgeGroup
                filters={[localFilter]}
                dataViews={this.state.indexPatterns}
                booleanRelation={BooleanRelation.AND}
                shouldShowBrackets={false}
              />
            </EuiText>
          </EuiFormRow>
        ) : null}
      </>
    );
  }

  private renderCustomEditor() {
    let helpText: EuiFormRowProps['helpText'] = '';

    if (this.props.docLinks) {
      helpText = (
        <EuiLink href={this.props.docLinks.links.query.queryDsl} target="_blank">
          {strings.getQueryDslDocsLinkLabel()}
        </EuiLink>
      );
    }

    if (this.props.filter?.meta.type === FILTERS.SPATIAL_FILTER) {
      helpText = (
        <EuiTextColor color="warning">{strings.getSpatialFilterQueryDslHelpText()}</EuiTextColor>
      );
    }

    return (
      <EuiFormRow fullWidth label={strings.getQueryDslLabel()} helpText={helpText}>
        <CodeEditor
          languageId={XJsonLang.ID}
          width="100%"
          height={'250px'}
          value={this.state.queryDsl}
          onChange={this.onQueryDslChange}
          data-test-subj="customEditorInput"
          aria-label={strings.getQueryDslAriaLabel()}
        />
      </EuiFormRow>
    );
  }

  private toggleCustomEditor = () => {
    const isCustomEditorOpen = !this.state.isCustomEditorOpen;
    this.setState({ isCustomEditorOpen });
    if (this.props.onLocalFilterUpdate) {
      this.props.onLocalFilterUpdate(
        isCustomEditorOpen ? this.getQueryDslFilter() : this.state.localFilter
      );
    }
    // re-calculate visible height when switching between editors
    this.state.resetVisibleHeight$.next();
  };

  private isUnknownFilterType() {
    const { type } = this.props.filter.meta;
    if (isCombinedFilter(this.props.filter)) {
      const { params } = this.props.filter.meta;
      return params && this.hasCombinedFilterCustomType(params);
    }
    return !!type && !['phrase', 'phrases', 'range', 'exists', 'combined'].includes(type);
  }

  private getIndexPatternFromFilter() {
    return getIndexPatternFromFilter(this.props.filter, this.state.indexPatterns);
  }

  private isQueryDslValid = (queryDsl: string) => {
    try {
      const queryDslJson = JSON.parse(queryDsl);
      return Object.keys(queryDslJson).length > 0;
    } catch {
      return false;
    }
  };

  private isFilterValid() {
    const { isCustomEditorOpen, queryDsl, selectedDataView, localFilter } = this.state;

    if (isCustomEditorOpen) {
      return this.isQueryDslValid(queryDsl);
    }

    if (!selectedDataView) {
      return false;
    }

    return flattenFilters([localFilter]).every((f) =>
      isFilterValid(
        selectedDataView,
        getFieldFromFilter(f, selectedDataView),
        getOperatorFromFilter(f),
        getFilterParams(f)
      )
    );
  }

  private onIndexPatternChange = ([selectedDataView]: FilterableSource[]) => {
    this.setState(
      ({ useSelectedDataViewOnSubmit, selectedDataView: previousDataView }) => ({
        selectedDataView,
        localFilter: buildEmptyFilter(false, selectedDataView.id),
        // Without a previous selection the filter's data view isn't available, so submit the picked one.
        useSelectedDataViewOnSubmit: useSelectedDataViewOnSubmit || !previousDataView,
        // The user chose the data view, so the notice about the automatic selection no longer applies.
        dataViewSelectedByFields: undefined,
      }),
      () => {
        // The picked data view changes the ID a Query DSL filter is saved with.
        if (this.state.isCustomEditorOpen) {
          this.props.onLocalFilterUpdate?.(this.getQueryDslFilter());
        }
      }
    );
  };

  private onCustomLabelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const customLabel = event.target.value;
    this.setState({ customLabel });
    if (this.props.onLocalFilterUpdate) {
      if (this.state.isCustomEditorOpen) {
        this.props.onLocalFilterUpdate(this.getQueryDslFilter({ customLabel }));
      } else {
        const localFilter = {
          ...this.state.localFilter,
          meta: {
            ...this.state.localFilter.meta,
            alias: customLabel || null,
          },
        };
        this.props.onLocalFilterUpdate(localFilter);
      }
    }
  };

  private onQueryDslChange = (queryDsl: string) => {
    this.setState({ queryDsl });
    this.props.onLocalFilterUpdate?.(this.getQueryDslFilter({ queryDsl }));
  };

  /** The Query DSL editor's state, compared with the initial one to detect unsaved changes. */
  private getQueryDslFilter(overrides: Partial<QueryDslFilter> = {}): QueryDslFilter {
    const { queryDsl, customLabel } = this.state;
    return { queryDsl, customLabel, dataViewId: this.getOriginalFilter().meta.index, ...overrides };
  }

  private getFilterFromQueryDsl = (queryDsl: string) => {
    const { customLabel } = this.state;
    const {
      $state,
      meta: { index, disabled = false, negate = false },
    } = this.getOriginalFilter();

    if (!$state || !$state.store) {
      return;
    }

    const newIndex = index || this.state.indexPatterns[0]?.id || this.state.indexPatterns[0]?.title;
    try {
      const body = JSON.parse(queryDsl);
      return buildCustomFilter(newIndex, body, disabled, negate, customLabel || null, $state.store);
    } catch {
      return null;
    }
  };

  private onLocalFilterChange = (updatedFilters: Filter[]) => {
    const { selectedDataView, customLabel } = this.state;
    const alias = customLabel || null;
    const {
      $state,
      meta: { disabled = false },
    } = this.props.filter;

    if (!$state || !$state.store || !selectedDataView) {
      return;
    }

    let newFilter: Filter;

    if (updatedFilters.length === 1) {
      const f = updatedFilters[0];
      newFilter = {
        ...f,
        $state: {
          store: $state.store,
        },
        meta: {
          ...f.meta,
          disabled,
          alias,
        },
      };
    } else {
      // for the combined filters created on the builder, negate should always be false,
      // the global negation changes only from the exclude/inclue results panel item
      newFilter = buildCombinedFilter(
        BooleanRelation.AND,
        updatedFilters,
        selectedDataView,
        disabled,
        false,
        alias,
        $state.store
      );
    }

    this.setState({ localFilter: newFilter });
    this.props.onLocalFilterUpdate?.(newFilter);
    // re-calculate visible height on filter changes to allow height to grow when new filters added
    this.state.resetVisibleHeight$.next();
  };

  /** The filter being edited, pointed to the selected data view if its own one isn't available. */
  private getOriginalFilter(): Filter {
    const { filter } = this.props;
    const { selectedDataView, useSelectedDataViewOnSubmit } = this.state;
    return useSelectedDataViewOnSubmit && selectedDataView?.id
      ? rebindFilterDataView(filter, filter.meta.index, selectedDataView.id)
      : filter;
  }

  private onSubmit = () => {
    const { isCustomEditorOpen, queryDsl, customLabel } = this.state;
    const { $state } = this.props.filter;

    if (!$state || !$state.store) {
      return;
    }

    if (isCustomEditorOpen) {
      const originalFilter = this.getOriginalFilter();
      const filter =
        this.props.filter?.meta.type === FILTERS.CUSTOM ||
        // only convert non-custom filters to custom when DSL changes
        queryDsl !== this.parseFilterToQueryDsl(this.props.filter, this.state.indexPatterns)
          ? this.getFilterFromQueryDsl(queryDsl)
          : { ...originalFilter, meta: { ...originalFilter.meta, alias: customLabel || null } };
      if (!filter) {
        return;
      }

      this.props.onSubmit(filter);
    } else {
      const localFilter = {
        ...this.state.localFilter,
        meta: {
          ...this.state.localFilter.meta,
          alias: customLabel || null,
        },
      };
      this.props.onSubmit(localFilter);
    }
  };
}

export const FilterEditor = withEuiTheme(FilterEditorComponent);

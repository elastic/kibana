/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiFormRowProps,
  EuiIcon,
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  withEuiTheme,
  EuiTextColor,
  EuiLink,
  EuiLoadingSpinner,
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
import { DataView } from '@kbn/data-views-plugin/common';
import { DataViewsContract, getIndexPatternFromFilter } from '@kbn/data-plugin/public';
import { CodeEditor } from '@kbn/code-editor';
import { cx } from '@emotion/css';
import { WithEuiThemeProps } from '@elastic/eui/src/services/theme';
import type { DocLinksStart } from '@kbn/core-doc-links-browser';
import { GenericComboBox } from './generic_combo_box';
import {
  getFieldFromFilter,
  getOperatorFromFilter,
  isFilterValid,
} from './lib/filter_editor_utils';
import { FiltersBuilder } from '../../filters_builder';
import { FilterBadgeGroup } from '../../filter_badge/filter_badge_group';
import {
  MIDDLE_TRUNCATION_PROPS,
  SINGLE_SELECTION_AS_TEXT_PROPS,
  flattenFilters,
} from './lib/helpers';
import {
  filterBadgeStyle,
  filterPreviewLabelStyle,
  filtersBuilderMaxHeightCss,
} from './filter_editor.styles';
import { SuggestionsAbstraction } from '../../typeahead/suggestions_component';

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
}

export interface FilterEditorComponentProps {
  filter: Filter;
  indexPatterns: DataView[];
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
  indexPatterns: DataView[];
  selectedDataView?: DataView;
  customLabel: string | null;
  queryDsl: string;
  isCustomEditorOpen: boolean;
  localFilter: Filter;
  isLoadingDataView?: boolean;
}

class FilterEditorComponent extends Component<FilterEditorProps, State> {
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
    };
  }

  componentDidMount() {
    const { localFilter, queryDsl, customLabel, selectedDataView } = this.state;
    this.props.onLocalFilterCreate?.({
      filter: localFilter,
      queryDslFilter: { queryDsl, customLabel },
    });
    this.props.onLocalFilterUpdate?.(localFilter);
    if (!selectedDataView) {
      const dataViewId = this.props.filter.meta.index;
      if (!dataViewId || !this.props.dataViews) {
        this.setState({ isLoadingDataView: false });
      } else {
        this.loadDataView(dataViewId, this.props.dataViews);
      }
    }
  }

  /**
   * Helper function to load the data view from the index pattern id
   * E.g. in Discover there's just one active data view, so filters with different data view id
   * Than the currently selected data view need to load the data view from the id to display the filter
   * correctly
   * @param dataViewId
   * @private
   */
  private async loadDataView(dataViewId: string, dataViews: DataViewsContract) {
    try {
      const dataView = await dataViews.get(dataViewId, false);
      this.setState({
        selectedDataView: dataView,
        isLoadingDataView: false,
        indexPatterns: [dataView, ...this.props.indexPatterns],
        localFilter: merge({}, this.props.filter),
        queryDsl: this.parseFilterToQueryDsl(this.props.filter, this.state.indexPatterns),
      });
    } catch (e) {
      this.setState({
        isLoadingDataView: false,
      });
    }
  }

  private parseFilterToQueryDsl(filter: Filter, indexPatterns: DataView[]) {
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
      <div>
        <EuiPopoverTitle paddingSize="s">
          <EuiFlexGroup alignItems="baseline" responsive={false}>
            <EuiFlexItem>
              {this.props.mode === 'add' ? strings.getPanelTitleAdd() : strings.getPanelTitleEdit()}
            </EuiFlexItem>
            <EuiFlexItem grow={false} className="filterEditor__hiddenItem" />
            {toggleEditorFlexItem}
          </EuiFlexGroup>
        </EuiPopoverTitle>

        {this.state.isLoadingDataView ? (
          <div className="globalFilterItem__editorForm">
            <EuiLoadingSpinner />
          </div>
        ) : (
          <EuiForm>
            <div className="globalFilterItem__editorForm">
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
                />
              </EuiFormRow>
            </div>

            <EuiPopoverFooter paddingSize="s">
              {/* Adding isolation here fixes this bug https://github.com/elastic/kibana/issues/142211 */}
              <EuiFlexGroup
                direction="rowReverse"
                alignItems="center"
                style={{ isolation: 'isolate' }}
                responsive={false}
              >
                <EuiFlexItem grow={false}>
                  <EuiButton
                    fill
                    onClick={this.onSubmit}
                    isDisabled={!this.isFilterValid()}
                    data-test-subj="saveFilter"
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
          </EuiForm>
        )}
      </div>
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
    const { selectedDataView } = this.state;

    return (
      <>
        <EuiFormRow fullWidth label={strings.getDataView()}>
          <GenericComboBox
            fullWidth
            placeholder={strings.getSelectDataView()}
            options={this.state.indexPatterns}
            selectedOptions={selectedDataView ? [selectedDataView] : []}
            getLabel={(indexPattern) => indexPattern?.getName()}
            onChange={this.onIndexPatternChange}
            isClearable={false}
            data-test-subj="filterIndexPatternsSelect"
            singleSelection={SINGLE_SELECTION_AS_TEXT_PROPS}
            truncationProps={MIDDLE_TRUNCATION_PROPS}
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
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
        <div
          role="region"
          aria-label=""
          className={cx(filtersBuilderMaxHeightCss(this.props.theme.euiTheme), 'eui-yScroll')}
        >
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
          <>
            <EuiSpacer size="m" />
            <EuiFormRow
              fullWidth
              hasEmptyLabelSpace={true}
              className={cx(filterBadgeStyle, filterPreviewLabelStyle)}
              label={
                <FormattedMessage
                  id="unifiedSearch.filter.filterBar.preview"
                  defaultMessage="{icon} Preview"
                  values={{
                    icon: <EuiIcon type="inspect" size="s" />,
                  }}
                />
              }
            >
              <EuiText
                size="s"
                data-test-subj="filter-preview"
                css={{ overflowWrap: 'break-word' }}
              >
                <FilterBadgeGroup
                  filters={[localFilter]}
                  dataViews={this.state.indexPatterns}
                  booleanRelation={BooleanRelation.AND}
                  shouldShowBrackets={false}
                />
              </EuiText>
            </EuiFormRow>
          </>
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
      const { customLabel, queryDsl, localFilter } = this.state;
      if (isCustomEditorOpen) {
        this.props.onLocalFilterUpdate({ queryDsl, customLabel });
      } else {
        this.props.onLocalFilterUpdate(localFilter);
      }
    }
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

  private onIndexPatternChange = ([selectedDataView]: DataView[]) => {
    this.setState({
      selectedDataView,
      localFilter: buildEmptyFilter(false, selectedDataView.id),
    });
  };

  private onCustomLabelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const customLabel = event.target.value;
    this.setState({ customLabel });
    if (this.props.onLocalFilterUpdate) {
      if (this.state.isCustomEditorOpen) {
        const { queryDsl } = this.state;
        this.props.onLocalFilterUpdate({ queryDsl, customLabel });
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
    if (this.props.onLocalFilterUpdate) {
      const { customLabel } = this.state;
      this.props.onLocalFilterUpdate({ queryDsl, customLabel });
    }
  };

  private getFilterFromQueryDsl = (queryDsl: string) => {
    const { customLabel } = this.state;
    const {
      $state,
      meta: { index, disabled = false, negate = false },
    } = this.props.filter;

    if (!$state || !$state.store) {
      return;
    }

    const newIndex = index || this.state.indexPatterns[0].id!;
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
  };

  private onSubmit = () => {
    const { isCustomEditorOpen, queryDsl, customLabel } = this.state;
    const { $state } = this.props.filter;

    if (!$state || !$state.store) {
      return;
    }

    if (isCustomEditorOpen) {
      const filter =
        this.props.filter?.meta.type === FILTERS.CUSTOM ||
        // only convert non-custom filters to custom when DSL changes
        queryDsl !== this.parseFilterToQueryDsl(this.props.filter, this.state.indexPatterns)
          ? this.getFilterFromQueryDsl(queryDsl)
          : {
              ...this.props.filter,
              meta: {
                ...(this.props.filter.meta ?? {}),
                alias: customLabel || null,
              },
            };
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

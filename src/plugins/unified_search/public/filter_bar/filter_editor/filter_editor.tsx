/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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
  EuiBadge,
  withEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  type Filter,
  BooleanRelation,
  buildCombinedFilter,
  buildCustomFilter,
  buildEmptyFilter,
  filterToQueryDsl,
  getFilterParams,
} from '@kbn/es-query';
import { merge } from 'lodash';
import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { XJsonLang } from '@kbn/monaco';
import { DataView } from '@kbn/data-views-plugin/common';
import { getIndexPatternFromFilter } from '@kbn/data-plugin/public';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { cx } from '@emotion/css';
import { WithEuiThemeProps } from '@elastic/eui/src/services/theme';
import { GenericComboBox } from './generic_combo_box';
import {
  getFieldFromFilter,
  getOperatorFromFilter,
  isFilterValid,
} from './lib/filter_editor_utils';
import { FiltersBuilder } from '../../filters_builder';
import { FilterBadgeGroup } from '../../filter_badge/filter_badge_group';
import { flattenFilters } from './lib/helpers';
import {
  filterBadgeStyle,
  filterPreviewLabelStyle,
  filtersBuilderMaxHeightCss,
} from './filter_editor.styles';

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
  getQueryDslAriaLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.queryDslAriaLabel', {
      defaultMessage: 'Elasticsearch Query DSL editor',
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
  mode?: 'edit' | 'add';
}

export type FilterEditorProps = WithEuiThemeProps & FilterEditorComponentProps;

interface State {
  selectedDataView?: DataView;
  customLabel: string | null;
  queryDsl: string;
  isCustomEditorOpen: boolean;
  localFilter: Filter;
}

class FilterEditorComponent extends Component<FilterEditorProps, State> {
  constructor(props: FilterEditorProps) {
    super(props);
    const dataView = this.getIndexPatternFromFilter();
    this.state = {
      selectedDataView: dataView,
      customLabel: props.filter.meta.alias || '',
      queryDsl: this.parseFilterToQueryDsl(props.filter),
      isCustomEditorOpen: this.isUnknownFilterType(),
      localFilter: dataView ? merge({}, props.filter) : buildEmptyFilter(false),
    };
  }

  componentDidMount() {
    const { localFilter, queryDsl, customLabel } = this.state;
    this.props.onLocalFilterCreate?.({
      filter: localFilter,
      queryDslFilter: { queryDsl, customLabel },
    });
    this.props.onLocalFilterUpdate?.(localFilter);
  }

  private parseFilterToQueryDsl(filter: Filter) {
    const dsl = filterToQueryDsl(filter, this.props.indexPatterns);
    return JSON.stringify(dsl, null, 2);
  }

  public render() {
    return (
      <div>
        <EuiPopoverTitle paddingSize="s">
          <EuiFlexGroup alignItems="baseline" responsive={false}>
            <EuiFlexGroup gutterSize="s">
              {this.props.mode === 'add' ? strings.getPanelTitleAdd() : strings.getPanelTitleEdit()}
              <EuiBadge color="hollow">
                {i18n.translate('unifiedSearch.filter.filterEditor.experimentalLabel', {
                  defaultMessage: 'Technical preview',
                })}
              </EuiBadge>
            </EuiFlexGroup>
            <EuiFlexItem grow={false} className="filterEditor__hiddenItem" />
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                data-test-subj="editQueryDSL"
                onClick={this.toggleCustomEditor}
              >
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
          </EuiFlexGroup>
        </EuiPopoverTitle>

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
      </div>
    );
  }

  private renderIndexPatternInput() {
    if (
      this.props.indexPatterns.length <= 1 &&
      this.props.indexPatterns.find(
        (indexPattern) => indexPattern === this.getIndexPatternFromFilter()
      )
    ) {
      /**
       * Don't render the index pattern selector if there's just one \ zero index patterns
       * and if the index pattern the filter was LOADED with is in the indexPatterns list.
       **/

      return '';
    }
    const { selectedDataView } = this.state;
    return (
      <>
        <EuiFormRow fullWidth label={strings.getDataView()}>
          <GenericComboBox
            fullWidth
            placeholder={strings.getSelectDataView()}
            options={this.props.indexPatterns}
            selectedOptions={selectedDataView ? [selectedDataView] : []}
            getLabel={(indexPattern) => indexPattern.getName()}
            onChange={this.onIndexPatternChange}
            singleSelection={{ asPlainText: true }}
            isClearable={false}
            data-test-subj="filterIndexPatternsSelect"
          />
        </EuiFormRow>
        <EuiSpacer size="s" />
      </>
    );
  }

  private renderFiltersBuilderEditor() {
    const { selectedDataView, localFilter } = this.state;
    const flattenedFilters = flattenFilters([localFilter]);

    const shouldShowPreview =
      selectedDataView &&
      (flattenedFilters.length > 1 ||
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
              dataView={selectedDataView!}
              onChange={this.onLocalFilterChange}
              disabled={!selectedDataView}
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
                    icon: <EuiIcon type="inspect" size="s" />,
                  }}
                />
              </strong>
            }
          >
            <EuiText size="xs" data-test-subj="filter-preview">
              <FilterBadgeGroup
                filters={[localFilter]}
                dataViews={this.props.indexPatterns}
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
    return (
      <EuiFormRow fullWidth label={strings.getQueryDslLabel()}>
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
    return !!type && !['phrase', 'phrases', 'range', 'exists', 'combined'].includes(type);
  }

  private getIndexPatternFromFilter() {
    return getIndexPatternFromFilter(this.props.filter, this.props.indexPatterns);
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

    const newIndex = index || this.props.indexPatterns[0].id!;
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
      meta: { disabled = false, negate = false },
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
      newFilter = buildCombinedFilter(
        BooleanRelation.AND,
        updatedFilters,
        selectedDataView,
        disabled,
        negate,
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
      const filter = this.getFilterFromQueryDsl(queryDsl);
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

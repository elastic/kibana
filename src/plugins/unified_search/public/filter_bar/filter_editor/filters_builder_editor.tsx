/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiForm, EuiFormRow, EuiIcon, EuiText, EuiToolTip, withEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  type Filter,
  BooleanRelation,
  buildCombinedFilter,
  getFilterParams,
  DataViewBase,
} from '@kbn/es-query';
import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { DataView } from '@kbn/data-views-plugin/common';
import { cx } from '@emotion/css';
import { WithEuiThemeProps } from '@elastic/eui/src/services/theme';
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
import { Operator } from './lib';

const strings = {
  getSelectDataViewToolTip: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.chooseDataViewFirstToolTip', {
      defaultMessage: 'You need to select a data view first',
    }),
};

interface QueryDslFilter {
  queryDsl: string;
  customLabel: string | null;
}

interface FilterEditorComponentProps {
  filter: Filter;
  dataView: DataView | undefined;
  operators: Operator[];
  onFilterChange?: (filter: Filter | QueryDslFilter) => void;
  timeRangeForSuggestionsOverride?: boolean;
  filtersForSuggestions?: Filter[];
}

type FiltersBuilderEditorComponentProps = WithEuiThemeProps & FilterEditorComponentProps;

interface State {
  selectedDataView?: DataView;
}

class FiltersBuilderEditorComponent extends Component<FiltersBuilderEditorComponentProps, State> {
  public render() {
    const flattenedFilters = flattenFilters([this.props.filter]);

    const shouldShowPreview =
      this.props.dataView &&
      ((flattenedFilters.length > 1 && !this.hasCombinedFilterCustomType(flattenedFilters)) ||
        (flattenedFilters.length === 1 &&
          isFilterValid(
            this.props.dataView,
            getFieldFromFilter(flattenedFilters[0], this.props.dataView),
            getOperatorFromFilter(flattenedFilters[0], this.props.operators),
            getFilterParams(flattenedFilters[0])
          )));

    return (
      <div>
        <EuiForm>
          <div className="globalFilterItem__editorForm">
            <>
              <div
                role="region"
                aria-label=""
                className={cx(filtersBuilderMaxHeightCss(this.props.theme.euiTheme), 'eui-yScroll')}
              >
                <EuiToolTip
                  position="top"
                  content={this.props.dataView ? '' : strings.getSelectDataViewToolTip()}
                  display="block"
                >
                  <FiltersBuilder
                    operators={this.props.operators}
                    filters={[this.props.filter]}
                    timeRangeForSuggestionsOverride={this.props.timeRangeForSuggestionsOverride}
                    filtersForSuggestions={this.props.filtersForSuggestions}
                    dataView={this.props.dataView!}
                    onChange={this.onLocalFilterChange}
                    disabled={!this.props.dataView}
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
                      filters={[this.props.filter]}
                      dataViews={[this.props.dataView as DataViewBase]}
                      booleanRelation={BooleanRelation.AND}
                      shouldShowBrackets={false}
                    />
                  </EuiText>
                </EuiFormRow>
              ) : null}
            </>
          </div>
        </EuiForm>
      </div>
    );
  }

  private hasCombinedFilterCustomType(filters: Filter[]) {
    return filters.some((filter) => filter.meta.type === 'custom');
  }

  private onLocalFilterChange = (updatedFilters: Filter[]) => {
    const { dataView } = this.props;
    const {
      $state,
      meta: { disabled = false },
    } = this.props.filter;

    if (!$state || !$state.store || !dataView) {
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
        },
      };
    } else {
      // for the combined filters created on the builder, negate should always be false,
      // the global negation changes only from the exclude/inclue results panel item
      newFilter = buildCombinedFilter(
        BooleanRelation.AND,
        updatedFilters,
        dataView,
        disabled,
        false,
        null,
        $state.store
      );
    }

    if (this.props.onFilterChange) {
      this.props.onFilterChange(newFilter);
    }
  };
}

export const FiltersBuilderEditor = withEuiTheme(FiltersBuilderEditorComponent);

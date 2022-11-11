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
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  BooleanRelation,
  buildCombinedFilter,
  buildCustomFilter,
  buildEmptyFilter,
  cleanFilter,
  FieldFilter,
  Filter,
  getFilterParams,
  isCombinedFilter,
} from '@kbn/es-query';
import React, { Component } from 'react';
import { XJsonLang } from '@kbn/monaco';
import { DataView } from '@kbn/data-views-plugin/common';
import { getIndexPatternFromFilter } from '@kbn/data-plugin/public';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { css, cx } from '@emotion/css';
import { GenericComboBox } from './generic_combo_box';
import {
  getFieldFromFilter,
  getOperatorFromFilter,
  isFilterValid,
} from './lib/filter_editor_utils';
import { FiltersBuilder } from '../../filters_builder';
import { FilterBadgeGroup } from '../../filter_badge/filter_badge_group';
import { flattenFilters } from './lib/helpers';

/** The default max-height of the Add/Edit Filter popover used to show "+n More" filters (e.g. `+4 More`) */
export const DEFAULT_MAX_HEIGHT = '233px';

const filtersBuilderMaxHeight = css`
  max-height: ${DEFAULT_MAX_HEIGHT};
`;

/** @todo: should be removed, no hardcoded sizes **/
const filterBadgeStyle = css`
  .euiFormRow__fieldWrapper {
    font-size: 12px;
    line-height: 1.5;
  }
`;

export interface FilterEditorProps {
  filter: Filter;
  indexPatterns: DataView[];
  onSubmit: (filter: Filter) => void;
  onCancel: () => void;
  timeRangeForSuggestionsOverride?: boolean;
  mode?: 'edit' | 'add';
}

interface State {
  selectedDataView?: DataView;
  customLabel: string | null;
  queryDsl: string;
  isCustomEditorOpen: boolean;
  localFilter: Filter;
}

const panelTitleAdd = i18n.translate('unifiedSearch.filter.filterEditor.addFilterPopupTitle', {
  defaultMessage: 'Add filter',
});
const panelTitleEdit = i18n.translate('unifiedSearch.filter.filterEditor.editFilterPopupTitle', {
  defaultMessage: 'Edit filter',
});

const addButtonLabel = i18n.translate('unifiedSearch.filter.filterEditor.addButtonLabel', {
  defaultMessage: 'Add filter',
});
const updateButtonLabel = i18n.translate('unifiedSearch.filter.filterEditor.updateButtonLabel', {
  defaultMessage: 'Update filter',
});
const disableToggleModeTooltip = i18n.translate(
  'unifiedSearch.filter.filterEditor.disableToggleModeTooltip',
  {
    defaultMessage: '"Edit as Query DSL" operation is not supported for combined filters',
  }
);

export class FilterEditor extends Component<FilterEditorProps, State> {
  constructor(props: FilterEditorProps) {
    super(props);
    const dataView = this.getIndexPatternFromFilter();
    this.state = {
      selectedDataView: dataView,
      customLabel: props.filter.meta.alias || '',
      queryDsl: JSON.stringify(cleanFilter(props.filter), null, 2),
      isCustomEditorOpen: this.isUnknownFilterType(),
      localFilter: dataView ? props.filter : buildEmptyFilter(false),
    };
  }

  public render() {
    const { localFilter } = this.state;
    const shouldDisableToggle = isCombinedFilter(localFilter);

    return (
      <div>
        <EuiPopoverTitle paddingSize="s">
          <EuiFlexGroup alignItems="baseline" responsive={false}>
            <EuiFlexItem>{this.props.mode === 'add' ? panelTitleAdd : panelTitleEdit}</EuiFlexItem>
            <EuiFlexItem grow={false} className="filterEditor__hiddenItem" />
            <EuiFlexItem grow={false}>
              <EuiToolTip
                position="top"
                content={shouldDisableToggle ? disableToggleModeTooltip : null}
                display="block"
              >
                <EuiButtonEmpty
                  size="xs"
                  data-test-subj="editQueryDSL"
                  disabled={shouldDisableToggle}
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
              </EuiToolTip>
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
            <EuiFormRow
              label={i18n.translate(
                'unifiedSearch.filter.filterEditor.createCustomLabelInputLabel',
                {
                  defaultMessage: 'Custom label (optional)',
                }
              )}
              fullWidth
            >
              <EuiFieldText
                value={`${this.state.customLabel}`}
                onChange={this.onCustomLabelChange}
                placeholder={i18n.translate(
                  'unifiedSearch.filter.filterEditor.customLabelPlaceholder',
                  {
                    defaultMessage: 'Add a custom label here',
                  }
                )}
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
                  isDisabled={!this.isFiltersValid()}
                  data-test-subj="saveFilter"
                >
                  {this.props.mode === 'add' ? addButtonLabel : updateButtonLabel}
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
        <EuiFormRow
          fullWidth
          label={i18n.translate('unifiedSearch.filter.filterEditor.dateViewSelectLabel', {
            defaultMessage: 'Data view',
          })}
        >
          <GenericComboBox
            fullWidth
            placeholder={i18n.translate(
              'unifiedSearch.filter.filterBar.indexPatternSelectPlaceholder',
              {
                defaultMessage: 'Select a data view',
              }
            )}
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
            getFieldFromFilter(flattenedFilters[0] as FieldFilter, selectedDataView),
            getOperatorFromFilter(flattenedFilters[0]),
            getFilterParams(flattenedFilters[0])
          )));

    return (
      <>
        <div role="region" aria-label="" className={cx(filtersBuilderMaxHeight, 'eui-yScroll')}>
          <FiltersBuilder
            filters={[localFilter]}
            timeRangeForSuggestionsOverride={this.props.timeRangeForSuggestionsOverride}
            dataView={selectedDataView!}
            onChange={this.onLocalFilterChange}
          />
        </div>

        {shouldShowPreview ? (
          <EuiFormRow
            fullWidth
            hasEmptyLabelSpace={true}
            className={filterBadgeStyle}
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
            <FilterBadgeGroup
              filters={[localFilter]}
              dataViews={this.props.indexPatterns}
              booleanRelation={BooleanRelation.AND}
              shouldShowBrackets={false}
            />
          </EuiFormRow>
        ) : null}
      </>
    );
  }

  private renderCustomEditor() {
    return (
      <EuiFormRow
        fullWidth
        label={i18n.translate('unifiedSearch.filter.filterEditor.queryDslLabel', {
          defaultMessage: 'Elasticsearch Query DSL',
        })}
      >
        <CodeEditor
          languageId={XJsonLang.ID}
          width="100%"
          height={'250px'}
          value={this.state.queryDsl}
          onChange={this.onQueryDslChange}
          data-test-subj="customEditorInput"
          aria-label={i18n.translate('unifiedSearch.filter.filterEditor.queryDslAriaLabel', {
            defaultMessage: 'Elasticsearch Query DSL editor',
          })}
        />
      </EuiFormRow>
    );
  }

  private toggleCustomEditor = () => {
    const isCustomEditorOpen = !this.state.isCustomEditorOpen;
    this.setState({ isCustomEditorOpen });
  };

  private isUnknownFilterType() {
    const { type } = this.props.filter.meta;
    return !!type && !['phrase', 'phrases', 'range', 'exists', 'combined'].includes(type);
  }

  private getIndexPatternFromFilter() {
    return getIndexPatternFromFilter(this.props.filter, this.props.indexPatterns);
  }

  private isFiltersValid() {
    const { isCustomEditorOpen, queryDsl, selectedDataView, localFilter } = this.state;

    if (isCustomEditorOpen) {
      try {
        const queryDslJson = JSON.parse(queryDsl);
        return Object.keys(queryDslJson).length > 0;
      } catch (e) {
        return false;
      }
    }

    if (!selectedDataView) {
      return false;
    }

    return flattenFilters([localFilter]).every((f) =>
      isFilterValid(
        selectedDataView,
        getFieldFromFilter(f as FieldFilter, selectedDataView),
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
  };

  private onQueryDslChange = (queryDsl: string) => {
    this.setState({ queryDsl });
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
          negate,
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
  };

  private onSubmit = () => {
    const { isCustomEditorOpen, queryDsl, customLabel } = this.state;
    const {
      $state,
      meta: { index, disabled = false, negate = false },
    } = this.props.filter;

    if (!$state || !$state.store) {
      return;
    }

    if (isCustomEditorOpen) {
      const newIndex = index || this.props.indexPatterns[0].id!;
      const body = JSON.parse(queryDsl);
      const filter = buildCustomFilter(
        newIndex,
        body,
        disabled,
        negate,
        customLabel || null,
        $state.store
      );

      this.props.onSubmit(filter);
    } else {
      this.props.onSubmit(this.state.localFilter);
    }
  };
}

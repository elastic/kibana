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
  EuiPopoverFooter,
  EuiPopoverTitle,
  EuiSpacer,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
import {
  Filter,
  FieldFilter,
  buildFilter,
  buildCustomFilter,
  cleanFilter,
  getFilterParams,
  isCombinedFilter,
  buildCombinedFilter,
  BooleanRelation,
} from '@kbn/es-query';
import React, { Component } from 'react';
import { XJsonLang } from '@kbn/monaco';
import { DataView } from '@kbn/data-views-plugin/common';
import { getIndexPatternFromFilter } from '@kbn/data-plugin/public';
import { CodeEditor } from '@kbn/kibana-react-plugin/public';
import { css, cx } from '@emotion/css';
import { GenericComboBox, GenericComboBoxProps } from './generic_combo_box';
import {
  getFieldFromFilter,
  getOperatorFromFilter,
  isFilterValid,
} from './lib/filter_editor_utils';
import { FiltersBuilder } from '../../filters_builder';

/** The default max-height of the Add/Edit Filter popover used to show "+n More" filters (e.g. `+5 More`) */
export const DEFAULT_MAX_HEIGHT = '227px';

const filtersBuilderMaxHeight = css`
  max-height: ${DEFAULT_MAX_HEIGHT};
`;

export interface FilterEditorProps {
  filter: Filter;
  indexPatterns: DataView[];
  onSubmit: (filter: Filter) => void;
  onCancel: () => void;
  intl: InjectedIntl;
  timeRangeForSuggestionsOverride?: boolean;
  mode?: 'edit' | 'add';
}

interface State {
  selectedIndexPattern?: DataView;
  useCustomLabel: boolean;
  customLabel: string | null;
  queryDsl: string;
  isCustomEditorOpen: boolean;
  filters: Filter[];
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

class FilterEditorUI extends Component<FilterEditorProps, State> {
  constructor(props: FilterEditorProps) {
    super(props);
    this.state = {
      selectedIndexPattern: this.getIndexPatternFromFilter(),
      useCustomLabel: props.filter.meta.alias !== null,
      customLabel: props.filter.meta.alias || '',
      queryDsl: JSON.stringify(cleanFilter(props.filter), null, 2),
      isCustomEditorOpen: this.isUnknownFilterType(),
      filters: [props.filter],
    };
  }

  public render() {
    return (
      <div>
        <EuiPopoverTitle paddingSize="s">
          <EuiFlexGroup alignItems="baseline" responsive={false}>
            <EuiFlexItem>{this.props.mode === 'add' ? panelTitleAdd : panelTitleEdit}</EuiFlexItem>
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

            <EuiSpacer size="m" />

            <EuiSwitch
              id="filterEditorCustomLabelSwitch"
              data-test-subj="createCustomLabel"
              label={this.props.intl.formatMessage({
                id: 'unifiedSearch.filter.filterEditor.createCustomLabelSwitchLabel',
                defaultMessage: 'Create custom label?',
              })}
              checked={this.state.useCustomLabel}
              onChange={this.onCustomLabelSwitchChange}
            />

            {this.state.useCustomLabel && (
              <div>
                <EuiSpacer size="m" />
                <EuiFormRow
                  label={this.props.intl.formatMessage({
                    id: 'unifiedSearch.filter.filterEditor.createCustomLabelInputLabel',
                    defaultMessage: 'Custom label',
                  })}
                  fullWidth
                >
                  <EuiFieldText
                    value={`${this.state.customLabel}`}
                    onChange={this.onCustomLabelChange}
                    fullWidth
                  />
                </EuiFormRow>
              </div>
            )}
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
    const { selectedIndexPattern } = this.state;
    return (
      <>
        <EuiFormRow
          fullWidth
          label={this.props.intl.formatMessage({
            id: 'unifiedSearch.filter.filterEditor.dateViewSelectLabel',
            defaultMessage: 'Data view',
          })}
        >
          <IndexPatternComboBox
            fullWidth
            placeholder={this.props.intl.formatMessage({
              id: 'unifiedSearch.filter.filterBar.indexPatternSelectPlaceholder',
              defaultMessage: 'Select a data view',
            })}
            options={this.props.indexPatterns}
            selectedOptions={selectedIndexPattern ? [selectedIndexPattern] : []}
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
    const { selectedIndexPattern, filters } = this.state;

    return (
      <div role="region" aria-label="" className={cx(filtersBuilderMaxHeight, 'eui-yScroll')}>
        <FiltersBuilder
          filters={filters}
          dataView={selectedIndexPattern}
          onChange={(filtersBuilder: Filter[]) => {
            this.setState({ filters: filtersBuilder });
          }}
        />
      </div>
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

  private isFilterValid() {
    const {
      isCustomEditorOpen,
      queryDsl,
      selectedIndexPattern: indexPattern,
      filters,
    } = this.state;

    if (isCustomEditorOpen) {
      try {
        const queryDslJson = JSON.parse(queryDsl);
        return Object.keys(queryDslJson).length > 0;
      } catch (e) {
        return false;
      }
    }

    const mappedFilter = (filter: Filter) => {
      return filter.meta.params.map((item: Filter) => validationCheck(item));
    };

    function validationCheck(filter: Filter) {
      if (isCombinedFilter(filter)) {
        return mappedFilter(filter);
      } else {
        return isFilterValid(
          indexPattern,
          getFieldFromFilter(filter as FieldFilter, indexPattern!),
          getOperatorFromFilter(filter),
          getFilterParams(filter)
        );
      }
    }
    const flattenedFillters = filters.map((filter) => validationCheck(filter)).flat(Infinity);

    return flattenedFillters.every((checkedFilter) => Boolean(checkedFilter));
  }

  private onIndexPatternChange = ([selectedIndexPattern]: DataView[]) => {
    const filters = [this.props.filter];
    this.setState({ selectedIndexPattern, filters });
  };

  private onCustomLabelSwitchChange = (event: EuiSwitchEvent) => {
    const useCustomLabel = event.target.checked;
    const customLabel = event.target.checked ? '' : null;
    this.setState({ useCustomLabel, customLabel });
  };

  private onCustomLabelChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const customLabel = event.target.value;
    this.setState({ customLabel });
  };

  private onQueryDslChange = (queryDsl: string) => {
    this.setState({ queryDsl });
  };

  private onSubmit = () => {
    const {
      selectedIndexPattern: indexPattern,
      useCustomLabel,
      customLabel,
      isCustomEditorOpen,
      queryDsl,
    } = this.state;

    const { $state } = this.props.filter;
    if (!$state || !$state.store) {
      return; // typescript validation
    }
    const alias = useCustomLabel ? customLabel : null;

    if (isCustomEditorOpen) {
      const { index, disabled = false, negate = false } = this.props.filter.meta;
      const newIndex = index || this.props.indexPatterns[0].id!;
      const body = JSON.parse(queryDsl);
      const filter = buildCustomFilter(newIndex, body, disabled, negate, alias, $state.store);
      this.props.onSubmit(filter);
    } else if (indexPattern) {
      const mappedFilter = (filter: Filter) => {
        return filter.meta.params.map((item: Filter) => builderFilter(item));
      };

      const builderFilter = (filter: Filter) => {
        if (isCombinedFilter(filter)) {
          return buildCombinedFilter(filter.meta.relation, mappedFilter(filter));
        } else {
          return buildFilter(
            indexPattern,
            getFieldFromFilter(filter as FieldFilter, indexPattern)!,
            getOperatorFromFilter(filter)?.type!,
            getOperatorFromFilter(filter)?.negate!,
            filter.meta.disabled ?? false,
            getFilterParams(filter) ?? '',
            alias,
            filter?.$state?.store
          );
        }
      };
      const filters = this.state.filters.map((filter: Filter) => builderFilter(filter));
      const builedFilter =
        filters.length === 1
          ? filters[0]
          : buildCombinedFilter(BooleanRelation.AND, filters, alias);
      this.props.onSubmit(builedFilter);
    }
  };
}

function IndexPatternComboBox(props: GenericComboBoxProps<DataView>) {
  return GenericComboBox(props);
}

export const FilterEditor = injectI18n(FilterEditorUI);

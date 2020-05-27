/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { EuiContextMenu, EuiPopover } from '@elastic/eui';
import { InjectedIntl, injectI18n } from '@kbn/i18n/react';
import classNames from 'classnames';
import React, { Component, MouseEvent } from 'react';
import { IUiSettingsClient } from 'src/core/public';
import { FilterEditor } from './filter_editor';
import { FilterView } from './filter_view';
import { IIndexPattern } from '../..';
import {
  Filter,
  isFilterPinned,
  getDisplayValueFromFilter,
  toggleFilterNegated,
  toggleFilterPinned,
  toggleFilterDisabled,
  getIndexPatternFromFilter,
} from '../../../common';
import { getIndexPatterns } from '../../services';

interface Props {
  id: string;
  filter: Filter;
  indexPatterns: IIndexPattern[];
  className?: string;
  onUpdate: (filter: Filter) => void;
  onRemove: () => void;
  intl: InjectedIntl;
  uiSettings: IUiSettingsClient;
}

interface LabelOptions {
  title: string;
  status: string;
  message?: string;
}

const FILTER_ITEM_OK = '';
const FILTER_ITEM_WARNING = 'warn';
const FILTER_ITEM_ERROR = 'error';

interface State {
  isPopoverOpen: boolean;
  indexPatternExists?: boolean;
}

class FilterItemUI extends Component<Props, State> {
  public state = {
    isPopoverOpen: false,
    indexPatternExists: undefined,
  };

  componentDidMount() {
    const { filter } = this.props;
    if (filter.meta.index) {
      getIndexPatterns()
        .get(filter.meta.index)
        .then((indexPattern) => {
          this.setState({
            indexPatternExists: !!indexPattern,
          });
        });
    }
  }

  private handleBadgeClick = (e: MouseEvent<HTMLInputElement>) => {
    if (e.shiftKey) {
      this.onToggleDisabled();
    } else {
      this.togglePopover();
    }
  };

  private isValidLabel(labelConfig: LabelOptions) {
    return labelConfig.status === FILTER_ITEM_OK;
  }

  private isDisabled(labelConfig: LabelOptions) {
    const { disabled } = this.props.filter.meta;
    return disabled || !this.isValidLabel(labelConfig);
  }

  private getClasses(negate: boolean, labelConfig: LabelOptions) {
    const { filter } = this.props;
    return classNames(
      'globalFilterItem',
      {
        'globalFilterItem-isDisabled': this.isDisabled(labelConfig),
        'globalFilterItem-isError': labelConfig.status === FILTER_ITEM_ERROR,
        'globalFilterItem-isWarning': labelConfig.status === FILTER_ITEM_WARNING,
        'globalFilterItem-isPinned': isFilterPinned(filter),
        'globalFilterItem-isExcluded': negate,
      },
      this.props.className
    );
  }

  private getDataTestSubj(labelConfig: LabelOptions) {
    const { filter } = this.props;
    const dataTestSubjKey = filter.meta.key ? `filter-key-${filter.meta.key}` : '';
    const dataTestSubjValue = filter.meta.value
      ? `filter-value-${this.isValidLabel(labelConfig) ? labelConfig.title : labelConfig.status}`
      : '';
    const dataTestSubjDisabled = `filter-${
      this.isValidLabel(labelConfig) ? 'enabled' : 'disabled'
    }`;
    const dataTestSubjPinned = `filter-${isFilterPinned(filter) ? 'pinned' : 'unpinned'}`;
    return `filter ${dataTestSubjDisabled} ${dataTestSubjKey} ${dataTestSubjValue} ${dataTestSubjPinned}`;
  }

  private getPanels(negate: boolean, disabled: boolean) {
    const { filter } = this.props;
    return [
      {
        id: 0,
        items: [
          {
            name: isFilterPinned(filter)
              ? this.props.intl.formatMessage({
                  id: 'data.filter.filterBar.unpinFilterButtonLabel',
                  defaultMessage: 'Unpin',
                })
              : this.props.intl.formatMessage({
                  id: 'data.filter.filterBar.pinFilterButtonLabel',
                  defaultMessage: 'Pin across all apps',
                }),
            icon: 'pin',
            onClick: () => {
              this.closePopover();
              this.onTogglePinned();
            },
            'data-test-subj': 'pinFilter',
          },
          {
            name: this.props.intl.formatMessage({
              id: 'data.filter.filterBar.editFilterButtonLabel',
              defaultMessage: 'Edit filter',
            }),
            icon: 'pencil',
            panel: 1,
            'data-test-subj': 'editFilter',
          },
          {
            name: negate
              ? this.props.intl.formatMessage({
                  id: 'data.filter.filterBar.includeFilterButtonLabel',
                  defaultMessage: 'Include results',
                })
              : this.props.intl.formatMessage({
                  id: 'data.filter.filterBar.excludeFilterButtonLabel',
                  defaultMessage: 'Exclude results',
                }),
            icon: negate ? 'plusInCircle' : 'minusInCircle',
            onClick: () => {
              this.closePopover();
              this.onToggleNegated();
            },
            'data-test-subj': 'negateFilter',
          },
          {
            name: disabled
              ? this.props.intl.formatMessage({
                  id: 'data.filter.filterBar.enableFilterButtonLabel',
                  defaultMessage: 'Re-enable',
                })
              : this.props.intl.formatMessage({
                  id: 'data.filter.filterBar.disableFilterButtonLabel',
                  defaultMessage: 'Temporarily disable',
                }),
            icon: `${disabled ? 'eye' : 'eyeClosed'}`,
            onClick: () => {
              this.closePopover();
              this.onToggleDisabled();
            },
            'data-test-subj': 'disableFilter',
          },
          {
            name: this.props.intl.formatMessage({
              id: 'data.filter.filterBar.deleteFilterButtonLabel',
              defaultMessage: 'Delete',
            }),
            icon: 'trash',
            onClick: () => {
              this.closePopover();
              this.props.onRemove();
            },
            'data-test-subj': 'deleteFilter',
          },
        ],
      },
      {
        id: 1,
        width: 420,
        content: (
          <div>
            <FilterEditor
              filter={filter}
              indexPatterns={this.props.indexPatterns}
              onSubmit={this.onSubmit}
              onCancel={this.closePopover}
            />
          </div>
        ),
      },
    ];
  }

  private getValueLabel(): LabelOptions {
    const { filter } = this.props;
    const label = {
      title: '',
      message: '',
      status: FILTER_ITEM_OK,
    };
    const validIndexPattern = getIndexPatternFromFilter(filter, this.props.indexPatterns);
    if (validIndexPattern) {
      try {
        label.title = getDisplayValueFromFilter(filter, this.props.indexPatterns);
      } catch (e) {
        label.status = FILTER_ITEM_ERROR;
        label.title = this.props.intl.formatMessage({
          id: 'data.filter.filterBar.labelErrorText',
          defaultMessage: `Error`,
        });
        label.message = e.message;
      }
    } else {
      if (this.state.indexPatternExists) {
        label.status = FILTER_ITEM_WARNING;
        label.title = this.props.intl.formatMessage({
          id: 'data.filter.filterBar.labelWarningText',
          defaultMessage: `Warning`,
        });
        label.message = this.props.intl.formatMessage(
          {
            id: 'data.filter.filterBar.labelWarningInfo',
            defaultMessage:
              'Filter for index pattern {indexPattern} is not applicable to current view',
          },
          {
            indexPattern: filter.meta.index,
          }
        );
      } else {
        label.status = FILTER_ITEM_ERROR;
        label.title = this.props.intl.formatMessage({
          id: 'data.filter.filterBar.labelErrorText',
          defaultMessage: `Error`,
        });
        label.message = this.props.intl.formatMessage(
          {
            id: 'data.filter.filterBar.labelErrorInfo',
            defaultMessage: 'Index pattern {indexPattern} not found',
          },
          {
            indexPattern: filter.meta.index,
          }
        );
      }
    }

    return label;
  }

  public render() {
    // Don't render until we know if the index pattern is valid
    if (this.state.indexPatternExists === undefined) return null;

    const { filter, id } = this.props;
    const { negate, disabled } = filter.meta;

    const valueLabelConfig = this.getValueLabel();

    const badge = (
      <FilterView
        filter={filter}
        valueLabel={valueLabelConfig.title}
        errorMessage={valueLabelConfig.message}
        className={this.getClasses(negate, valueLabelConfig)}
        iconOnClick={() => this.props.onRemove()}
        onClick={this.handleBadgeClick}
        data-test-subj={this.getDataTestSubj(valueLabelConfig)}
      />
    );

    return (
      <EuiPopover
        id={`popoverFor_filter${id}`}
        className={`globalFilterItem__popover`}
        anchorClassName={`globalFilterItem__popoverAnchor`}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        button={badge}
        anchorPosition="downLeft"
        withTitle={true}
        panelPaddingSize="none"
      >
        <EuiContextMenu initialPanelId={0} panels={this.getPanels(negate, disabled)} />
      </EuiPopover>
    );
  }

  private closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  private togglePopover = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  private onSubmit = (filter: Filter) => {
    this.closePopover();
    this.props.onUpdate(filter);
  };

  private onTogglePinned = () => {
    const filter = toggleFilterPinned(this.props.filter);
    this.props.onUpdate(filter);
  };

  private onToggleNegated = () => {
    const filter = toggleFilterNegated(this.props.filter);
    this.props.onUpdate(filter);
  };

  private onToggleDisabled = () => {
    const filter = toggleFilterDisabled(this.props.filter);
    this.props.onUpdate(filter);
  };
}

export const FilterItem = injectI18n(FilterItemUI);

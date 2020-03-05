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
} from '../../../common';

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

interface State {
  isPopoverOpen: boolean;
}

class FilterItemUI extends Component<Props, State> {
  public state = {
    isPopoverOpen: false,
  };

  private handleBadgeClick = (e: MouseEvent<HTMLInputElement>) => {
    if (e.shiftKey) {
      this.onToggleDisabled();
    } else {
      this.togglePopover();
    }
  };
  public render() {
    const { filter, id } = this.props;
    const { negate, disabled } = filter.meta;

    const classes = classNames(
      'globalFilterItem',
      {
        'globalFilterItem-isDisabled': disabled,
        'globalFilterItem-isPinned': isFilterPinned(filter),
        'globalFilterItem-isExcluded': negate,
      },
      this.props.className
    );

    const valueLabel = getDisplayValueFromFilter(filter, this.props.indexPatterns);
    const dataTestSubjKey = filter.meta.key ? `filter-key-${filter.meta.key}` : '';
    const dataTestSubjValue = filter.meta.value ? `filter-value-${valueLabel}` : '';
    const dataTestSubjDisabled = `filter-${
      this.props.filter.meta.disabled ? 'disabled' : 'enabled'
    }`;

    const badge = (
      <FilterView
        filter={filter}
        valueLabel={valueLabel}
        className={classes}
        iconOnClick={() => this.props.onRemove()}
        onClick={this.handleBadgeClick}
        data-test-subj={`filter ${dataTestSubjDisabled} ${dataTestSubjKey} ${dataTestSubjValue}`}
      />
    );

    const panelTree = [
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
        <EuiContextMenu initialPanelId={0} panels={panelTree} />
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

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

import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
import { Component } from 'react';
import React from 'react';

interface Props {
  onEnableAll: () => void;
  onDisableAll: () => void;
  onPinAll: () => void;
  onUnpinAll: () => void;
  onToggleAllNegated: () => void;
  onToggleAllDisabled: () => void;
  onRemoveAll: () => void;
  intl: InjectedIntl;
}

interface State {
  isPopoverOpen: boolean;
}

class FilterOptionsUI extends Component<Props, State> {
  public state: State = {
    isPopoverOpen: false,
  };

  public togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  public closePopover = () => {
    this.setState({ isPopoverOpen: false });
  };

  public render() {
    const panelTree = {
      id: 0,
      items: [
        {
          name: this.props.intl.formatMessage({
            id: 'data.filter.options.enableAllFiltersButtonLabel',
            defaultMessage: 'Enable all',
          }),
          icon: 'eye',
          onClick: () => {
            this.closePopover();
            this.props.onEnableAll();
          },
          'data-test-subj': 'enableAllFilters',
        },
        {
          name: this.props.intl.formatMessage({
            id: 'data.filter.options.disableAllFiltersButtonLabel',
            defaultMessage: 'Disable all',
          }),
          icon: 'eyeClosed',
          onClick: () => {
            this.closePopover();
            this.props.onDisableAll();
          },
          'data-test-subj': 'disableAllFilters',
        },
        {
          name: this.props.intl.formatMessage({
            id: 'data.filter.options.pinAllFiltersButtonLabel',
            defaultMessage: 'Pin all',
          }),
          icon: 'pin',
          onClick: () => {
            this.closePopover();
            this.props.onPinAll();
          },
          'data-test-subj': 'pinAllFilters',
        },
        {
          name: this.props.intl.formatMessage({
            id: 'data.filter.options.unpinAllFiltersButtonLabel',
            defaultMessage: 'Unpin all',
          }),
          icon: 'pin',
          onClick: () => {
            this.closePopover();
            this.props.onUnpinAll();
          },
          'data-test-subj': 'unpinAllFilters',
        },
        {
          name: this.props.intl.formatMessage({
            id: 'data.filter.options.invertNegatedFiltersButtonLabel',
            defaultMessage: 'Invert inclusion',
          }),
          icon: 'invert',
          onClick: () => {
            this.closePopover();
            this.props.onToggleAllNegated();
          },
          'data-test-subj': 'invertInclusionAllFilters',
        },
        {
          name: this.props.intl.formatMessage({
            id: 'data.filter.options.invertDisabledFiltersButtonLabel',
            defaultMessage: 'Invert enabled/disabled',
          }),
          icon: 'eye',
          onClick: () => {
            this.closePopover();
            this.props.onToggleAllDisabled();
          },
          'data-test-subj': 'invertEnableDisableAllFilters',
        },
        {
          name: this.props.intl.formatMessage({
            id: 'data.filter.options.deleteAllFiltersButtonLabel',
            defaultMessage: 'Remove all',
          }),
          icon: 'trash',
          onClick: () => {
            this.closePopover();
            this.props.onRemoveAll();
          },
          'data-test-subj': 'removeAllFilters',
        },
      ],
    };

    return (
      <EuiPopover
        id="popoverForAllFilters"
        className="globalFilterGroup__allFiltersPopover"
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover}
        button={
          <EuiButtonIcon
            onClick={this.togglePopover}
            iconType="filter"
            aria-label={this.props.intl.formatMessage({
              id: 'data.filter.options.changeAllFiltersButtonLabel',
              defaultMessage: 'Change all filters',
            })}
            title={this.props.intl.formatMessage({
              id: 'data.filter.options.changeAllFiltersButtonLabel',
              defaultMessage: 'Change all filters',
            })}
            data-test-subj="showFilterActions"
          />
        }
        anchorPosition="rightUp"
        panelPaddingSize="none"
        withTitle
        repositionOnScroll
      >
        <EuiPopoverTitle>
          <FormattedMessage
            id="data.filter.searchBar.changeAllFiltersTitle"
            defaultMessage="Change all filters"
          />
        </EuiPopoverTitle>
        <EuiContextMenu initialPanelId={0} panels={[panelTree]} />
      </EuiPopover>
    );
  }
}

export const FilterOptions = injectI18n(FilterOptionsUI);

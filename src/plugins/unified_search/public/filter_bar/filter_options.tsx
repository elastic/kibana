/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButtonIcon, EuiContextMenu, EuiPopover, EuiPopoverTitle } from '@elastic/eui';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n-react';
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
  private buttonRef = React.createRef<HTMLButtonElement>();

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
    this.buttonRef.current?.focus();
  };

  public render() {
    const panelTree = {
      id: 0,
      items: [
        {
          name: this.props.intl.formatMessage({
            id: 'unifiedSearch.filter.options.enableAllFiltersButtonLabel',
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
            id: 'unifiedSearch.filter.options.disableAllFiltersButtonLabel',
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
            id: 'unifiedSearch.filter.options.pinAllFiltersButtonLabel',
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
            id: 'unifiedSearch.filter.options.unpinAllFiltersButtonLabel',
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
            id: 'unifiedSearch.filter.options.invertNegatedFiltersButtonLabel',
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
            id: 'unifiedSearch.filter.options.invertDisabledFiltersButtonLabel',
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
            id: 'unifiedSearch.filter.options.deleteAllFiltersButtonLabel',
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
              id: 'unifiedSearch.filter.options.changeAllFiltersButtonLabel',
              defaultMessage: 'Change all filters',
            })}
            title={this.props.intl.formatMessage({
              id: 'unifiedSearch.filter.options.changeAllFiltersButtonLabel',
              defaultMessage: 'Change all filters',
            })}
            data-test-subj="showFilterActions"
            buttonRef={this.buttonRef}
          />
        }
        anchorPosition="rightUp"
        panelPaddingSize="none"
        repositionOnScroll
      >
        <EuiPopoverTitle paddingSize="m">
          <FormattedMessage
            id="unifiedSearch.filter.searchBar.changeAllFiltersTitle"
            defaultMessage="Change all filters"
          />
        </EuiPopoverTitle>
        <EuiContextMenu initialPanelId={0} panels={[panelTree]} />
      </EuiPopover>
    );
  }
}

export const FilterOptions = injectI18n(FilterOptionsUI);

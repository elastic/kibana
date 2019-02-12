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

import {
  EuiButton,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import PropTypes from 'prop-types';
import React from 'react';

import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';

interface SearchSelectionProps {
  onSearchSelected: (searchId: string, searchType: string) => void;
  onGoTo: (path: string) => void;
}

interface SearchSelectionState {
  selectedTab: TabProps;
}

interface TabProps {
  id: string;
  name: string;
  savedObjectFinder: React.ReactNode;
}

export class SearchSelection extends React.Component<SearchSelectionProps, SearchSelectionState> {
  public static propTypes = {
    onSearchSelected: PropTypes.func,
    onGoTo: PropTypes.func,
  };

  private tabs: TabProps[] = [];

  constructor(props: SearchSelectionProps) {
    super(props);

    const manageSavedSearchesBtn = (
      <EuiButton onClick={() => this.props.onGoTo('#/management/kibana/objects')}>
        <FormattedMessage
          id="kbn.visualize.newVisWizard.savedSearchTab.manageSavedSearchesButtonLabel"
          defaultMessage="Manage saved searches"
        />
      </EuiButton>
    );

    const manageIndexPatternsBtn = (
      <EuiButton onClick={() => this.props.onGoTo('#/management/kibana/index_patterns')}>
        <FormattedMessage
          id="kbn.visualize.newVisWizard.indexPatternTab.manageIndexPatternsButtonLabel"
          defaultMessage="Manage index patterns"
        />
      </EuiButton>
    );

    this.tabs = [
      {
        id: 'index-pattern',
        name: i18n.translate('kbn.visualize.newVisWizard.indexPatternTabLabel', {
          defaultMessage: 'Index pattern',
        }),
        savedObjectFinder: (
          <SavedObjectFinder
            key="visSavedObjectFinder"
            onChoose={this.props.onSearchSelected}
            callToActionButton={manageIndexPatternsBtn}
            noItemsMessage={i18n.translate(
              'kbn.visualize.newVisWizard.indexPatternTab.notFoundLabel',
              { defaultMessage: 'No matching index patterns found.' }
            )}
            savedObjectType="index-pattern"
          />
        ),
      },
      {
        id: 'searches',
        name: i18n.translate('kbn.visualize.newVisWizard.savedSearchTabLabel', {
          defaultMessage: 'Saved search',
        }),
        savedObjectFinder: (
          <SavedObjectFinder
            key="searchSavedObjectFinder"
            onChoose={this.props.onSearchSelected}
            callToActionButton={manageSavedSearchesBtn}
            noItemsMessage={i18n.translate(
              'kbn.visualize.newVisWizard.savedSearchTab.notFoundLabel',
              { defaultMessage: 'No matching saved searches found.' }
            )}
            savedObjectType="search"
          />
        ),
      },
    ];

    this.state = {
      selectedTab: this.tabs[0],
    };
    this.onSelectedTabChanged = this.onSelectedTabChanged.bind(this);
  }
  public onSelectedTabChanged = (tab: TabProps) => {
    this.setState({
      selectedTab: tab,
    });
  };

  public renderTabs() {
    return this.tabs.map(tab => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab)}
        isSelected={tab.id === this.state.selectedTab.id}
        key={tab.id}
      >
        {tab.name}
      </EuiTab>
    ));
  }

  public render() {
    return (
      <React.Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="kbn.visualize.newVisWizard.chooseSourceTitle"
              defaultMessage="Choose source"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiTabs size="m">{this.renderTabs()}</EuiTabs>

          <EuiSpacer size="m" />

          {this.state.selectedTab.savedObjectFinder}
        </EuiModalBody>
      </React.Fragment>
    );
  }
}

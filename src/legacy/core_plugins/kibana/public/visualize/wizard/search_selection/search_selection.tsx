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
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import { VisType } from 'ui/vis';

import { SavedObjectFinder } from 'ui/saved_objects/components/saved_object_finder';

interface SearchSelectionProps {
  onSearchSelected: (searchId: string, searchType: string) => void;
  visType: VisType;
}

interface SearchSelectionState {
  selectedTabId: string;
}

interface TabProps {
  id: string;
  name: string;
}

const INDEX_PATTERNS_TAB_ID = 'indexPatterns';
const SAVED_SEARCHES_TAB_ID = 'savedSearches';

export class SearchSelection extends React.Component<SearchSelectionProps, SearchSelectionState> {
  public state = {
    selectedTabId: INDEX_PATTERNS_TAB_ID,
  };
  private fixedPageSize: number = 8;

  public render() {
    return (
      <React.Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="kbn.visualize.newVisWizard.newVisTypeTitle"
              defaultMessage="New {visTypeName}"
              values={{ visTypeName: this.props.visType.title }}
            />{' '}
            /{' '}
            <FormattedMessage
              id="kbn.visualize.newVisWizard.chooseSourceTitle"
              defaultMessage="Choose a source"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <EuiTabs size="m">{this.renderTabs()}</EuiTabs>

          <EuiSpacer size="m" />

          {this.renderTab()}
        </EuiModalBody>
      </React.Fragment>
    );
  }

  private onSelectedTabChanged = (tab: TabProps) => {
    this.setState({
      selectedTabId: tab.id,
    });
  };

  private renderTabs() {
    const tabs = [
      {
        id: INDEX_PATTERNS_TAB_ID,
        name: i18n.translate('kbn.visualize.newVisWizard.indexPatternTabLabel', {
          defaultMessage: 'Index pattern',
        }),
      },
      {
        id: SAVED_SEARCHES_TAB_ID,
        name: i18n.translate('kbn.visualize.newVisWizard.savedSearchTabLabel', {
          defaultMessage: 'Saved search',
        }),
      },
    ];
    const { selectedTabId } = this.state;

    return tabs.map(tab => (
      <EuiTab
        onClick={() => this.onSelectedTabChanged(tab)}
        isSelected={tab.id === selectedTabId}
        key={tab.id}
        data-test-subj={`${tab.id}Tab`}
      >
        {tab.name}
      </EuiTab>
    ));
  }

  private renderTab() {
    if (this.state.selectedTabId === SAVED_SEARCHES_TAB_ID) {
      return (
        <SavedObjectFinder
          key="searchSavedObjectFinder"
          onChoose={this.props.onSearchSelected}
          noItemsMessage={i18n.translate(
            'kbn.visualize.newVisWizard.savedSearchTab.notFoundLabel',
            { defaultMessage: 'No matching saved searches found.' }
          )}
          savedObjectType="search"
          fixedPageSize={this.fixedPageSize}
        />
      );
    }

    return (
      <SavedObjectFinder
        key="visSavedObjectFinder"
        onChoose={this.props.onSearchSelected}
        noItemsMessage={i18n.translate('kbn.visualize.newVisWizard.indexPatternTab.notFoundLabel', {
          defaultMessage: 'No matching index patterns found.',
        })}
        savedObjectType="index-pattern"
        fixedPageSize={this.fixedPageSize}
      />
    );
  }
}

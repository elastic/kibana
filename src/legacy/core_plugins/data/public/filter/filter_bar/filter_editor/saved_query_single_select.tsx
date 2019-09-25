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

import React, { Component, Fragment } from 'react';
import { EuiSelectable, EuiLoadingContent } from '@elastic/eui';
// Types
import { sortBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { SavedQueryService } from '../../../search/search_bar/lib/saved_query_service';
import { SavedQuery } from '../../../search/search_bar';

type OptionCheckedType = 'on' | 'off' | undefined;

export interface Option {
  label: string;
  checked?: OptionCheckedType;
  disabled?: boolean;
  isGroupLabel?: boolean;
  prepend?: React.ReactNode;
  append?: React.ReactNode;
  ref?: (optionIndex: number) => void;
}
interface Props {
  savedQueryService: SavedQueryService;
  onChange: (selectedOption: Option[], savedQueries: SavedQuery[]) => void;
}
interface State {
  options: Option[];
  savedQueries: SavedQuery[];
  savedQueriesLoaded: boolean;
}
export class SavedQuerySingleSelect extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      options: [],
      savedQueries: [],
      savedQueriesLoaded: false,
    };
  }
  async componentDidMount() {
    const result = await this.getSavedQueries();
    if (result) {
      this.getMappedSavedQueries();
    }
  }

  getSavedQueries = async () => {
    const allSavedQueries = await this.props.savedQueryService.getAllSavedQueries();
    const sortedAllSavedQueries = sortBy(allSavedQueries, 'attributes.title');
    this.setState({
      savedQueries: sortedAllSavedQueries,
      savedQueriesLoaded: true,
    });
    return sortedAllSavedQueries;
  };

  getMappedSavedQueries = () => {
    const savedQueriesWithLabel = this.state.savedQueries
      .map(sq => {
        return {
          label: sq.id,
          checked: undefined,
        };
      })
      .map(option => {
        const { checked, ...checklessOption } = option;
        return { ...checklessOption };
      });
    this.setState({ options: savedQueriesWithLabel });
  };

  onSavedQueryChange = (options: Option[]) => {
    // options are already updated here, call the onChange handler from the filterEditorUI directly.
    const selectedOption = options.filter(option => option.checked === 'on');
    this.setState({
      options,
    });
    this.props.onChange(selectedOption, this.state.savedQueries); // pass up the full saved query object to the editor
  };

  render() {
    const { options, savedQueriesLoaded } = this.state;
    if (!savedQueriesLoaded || !options.length) {
      return <EuiLoadingContent lines={3} />;
    } else if (savedQueriesLoaded && !options.length) {
      return (
        <div>
          {i18n.translate('data.search.searchBar.savedQueryNoSavedQueriesText', {
            defaultMessage: 'There are no saved queries.',
          })}
        </div>
      );
    } else {
      return (
        <Fragment>
          <EuiSelectable
            options={options}
            onChange={this.onSavedQueryChange}
            singleSelection={true}
            listProps={{ bordered: true }}
          >
            {list => list}
          </EuiSelectable>
        </Fragment>
      );
    }
  }
}

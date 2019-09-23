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
import { EuiSelectable } from '@elastic/eui';
import { EuiButton } from '@elastic/eui';
// Types
import { sortBy } from 'lodash';
import { EuiLoadingContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SavedQueryService } from '../../../search/search_bar/lib/saved_query_service';
import { SavedQuery } from '../../../search/search_bar';

const Options = [
  {
    label: 'Titan',
  },
  {
    label: 'Enceladus is disabled',
    disabled: true,
  },
  {
    label: 'Mimas',
    checked: 'on',
  },
  {
    label: 'Dione',
  },
  {
    label: 'Iapetus',
    checked: 'on',
  },
  {
    label: 'Phoebe',
  },
  {
    label: 'Rhea',
  },
  {
    label: "Pandora is one of Saturn's moons, named for a Titaness of Greek mythology",
  },
  {
    label: 'Tethys',
  },
  {
    label: 'Hyperion',
  },
];

type OptionCheckedType = 'on' | 'off' | undefined;

interface Option {
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
  onChange: (selectedSavedQuery: Option[], savedQueries: SavedQuery[]) => void;
}
interface State {
  options: Option[];
  savedQueries: SavedQuery[];
  savedQueriesLoaded: boolean;
  selectedOption: Option[];
}
export class SavedQuerySingleSelect extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      options: [],
      savedQueries: [],
      savedQueriesLoaded: false,
      selectedOption: [],
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
    // local to this component: sets the new options when one is selected, it takes two clicks to get the selected one.
    const selectedOption = options.filter(option => option.checked === 'on');
    // if (selectedOption && selectedOption[0].label) {
    this.setState({
      options,
      selectedOption,
    });
    // }
  };

  onSavedQuerySelected = () => {
    if (this.state.selectedOption && this.state.savedQueries) {
      this.props.onChange(this.state.selectedOption, this.state.savedQueries);
    }
  };

  render() {
    const { options, savedQueriesLoaded, selectedOption } = this.state;
    // console.log(selectedOption);
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
          <EuiButton
            fill
            onClick={this.onSavedQuerySelected}
            isDisabled={!selectedOption || !selectedOption.length}
          >
            Save
          </EuiButton>
        </Fragment>
      );
    }
  }
}

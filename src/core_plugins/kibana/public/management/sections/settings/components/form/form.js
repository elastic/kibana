import React, { PureComponent , Fragment} from 'react';
import PropTypes from 'prop-types';

import {
  EuiForm,
  EuiFormRow,
  EuiSearchBar,
  EuiSpacer,
  EuiText,
  Query,
} from '@elastic/eui';

import { getCategoryName, DEFAULT_CATEGORY } from '../../lib';
import { Field } from '../field';

export class Form extends PureComponent {

  static propTypes = {
    settings: PropTypes.array.isRequired,
    save: PropTypes.func.isRequired,
    clear: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    const { settings } = this.props;
    this.state = {
      query: null,
      settings: this.mapSettings(settings),
    };
  }

  componentWillReceiveProps(nextProps) {
    const { query } = this.state;
    const { settings } = nextProps;
    this.setState({
      settings: this.mapSettings(query ? Query.execute(query, settings) : settings),
    });
  }

  mapSettings(settings) {
    return settings.reduce((groupedSettings, setting) => {
      const category = setting.category || DEFAULT_CATEGORY;
      (groupedSettings[category] = groupedSettings[category] || []).push(setting);
      return groupedSettings;
    }, {});
  }

  onQueryChange = (query) => {
    this.setState({
      query,
      settings: this.mapSettings(Query.execute(query, this.props.settings)),
    });
  }

  renderCategory(category, settings) {
    return (
      <Fragment key={category}>
        <EuiText>
          <h2>{getCategoryName(category)}</h2>
        </EuiText>
        <EuiSpacer size="m" />
        {settings.map(setting => {
          return (
            <Field
              key={setting.name}
              setting={setting}
              save={this.props.save}
              clear={this.props.clear}
            />
          );
        })}
      </Fragment>
    );
  }

  render() {
    const { settings } = this.state;

    const categories = Object.keys(settings).sort((a, b) => {
      if(a === DEFAULT_CATEGORY) return -1;
      if(a > b) return 1;
      return a === b ? 0 : -1;
    });

    const box = {
      incremental: true
    };

    const filters = [
      {
        type: 'field_value_selection',
        field: 'category',
        name: 'Category',
        multiSelect: false,
        options: categories.map(category => {
          return {
            value: category,
            name: getCategoryName(category),
          };
        })
      }
    ];

    return (
      <EuiForm>
        <EuiFormRow>
          <EuiSearchBar
            box={box}
            filters={filters}
            onChange={this.onQueryChange}
          />
        </EuiFormRow>

        {categories.map(category => {
          return (
            this.renderCategory(category, settings[category])
          );
        })}
      </EuiForm>
    );
  }
}

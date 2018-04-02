import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
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
    query: PropTypes.string,
  }

  constructor(props) {
    super(props);
    const { settings, query } = this.props;
    this.state = {
      query: query || null,
      settings: this.mapSettings(query ? Query.execute(Query.parse(query), settings) : settings),
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
      // We will want to change this logic when we put each category on its
      // own page aka allowing a setting to be included in multiple categories.
      const category = setting.category[0];
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

  renderCategory(category, settings, isLast) {
    return (
      <Fragment key={category}>
        <EuiForm>
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
        </EuiForm>
        {isLast ? '' : <EuiHorizontalRule />}
      </Fragment>
    );
  }

  render() {
    const { settings, query } = this.state;

    const categories = Object.keys(settings).sort((a, b) => {
      if(a === DEFAULT_CATEGORY) return -1;
      if(b === DEFAULT_CATEGORY) return 1;
      if(a > b) return 1;
      return a === b ? 0 : -1;
    });

    const box = {
      incremental: true,
    };

    const filters = [
      {
        type: 'field_value_selection',
        field: 'category',
        name: 'Category',
        multiSelect: 'or',
        options: categories.map(category => {
          return {
            value: category,
            name: getCategoryName(category),
          };
        })
      }
    ];

    return (
      <Fragment>
        <EuiForm>
          <EuiFormRow>
            <EuiSearchBar
              box={box}
              filters={filters}
              onChange={this.onQueryChange}
              defaultQuery={query}
            />
          </EuiFormRow>
        </EuiForm>
        <EuiSpacer />
        {categories.map((category, i) => {
          return (
            this.renderCategory(category, settings[category], i === categories.length - 1)
          );
        })}
      </Fragment>
    );
  }
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import _ from 'lodash';
import { collectionActions } from '../lib/collection_actions';
import { AddDeleteButtons } from '../add_delete_buttons';
import { ColorPicker } from '../color_picker';
import uuid from 'uuid';
import { EuiFieldText, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { injectI18n } from '@kbn/i18n-react';
import { getDefaultQueryLanguage } from '../lib/get_default_query_language';
import { QueryBarWrapper } from '../query_bar_wrapper';
class FilterItemsUi extends Component {
  constructor(props) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
  }

  handleChange(item, name) {
    return (e) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      handleChange(
        _.assign({}, item, {
          [name]: _.get(e, 'value', _.get(e, 'target.value')),
        })
      );
    };
  }
  handleQueryChange = (model, filter) => {
    const part = { filter };
    collectionActions.handleChange(this.props, _.assign({}, model, part));
  };
  renderRow(row, i, items) {
    const indexPatterns = this.props.indexPatterns;
    const defaults = { filter: '', label: '' };
    const model = { ...defaults, ...row };
    const handleChange = (part) => {
      const fn = collectionActions.handleChange.bind(null, this.props);
      fn(_.assign({}, model, part));
    };

    const newFilter = () => ({
      color: this.props.model.color,
      id: uuid.v1(),
      filter: { language: model.filter.language || getDefaultQueryLanguage(), query: '' },
    });
    const handleAdd = collectionActions.handleAdd.bind(null, this.props, newFilter);
    const handleDelete = collectionActions.handleDelete.bind(null, this.props, model);
    const { intl } = this.props;

    return (
      <EuiFlexGroup gutterSize="s" className="tvbAggRow" alignItems="center" key={model.id}>
        <EuiFlexItem grow={false}>
          <ColorPicker
            disableTrash={true}
            onChange={handleChange}
            name="color"
            value={model.color}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <QueryBarWrapper
            query={{
              language: model.filter.language || getDefaultQueryLanguage(),
              query: model.filter.query || '',
            }}
            onChange={(query) => this.handleQueryChange(model, query)}
            indexPatterns={[indexPatterns]}
            data-test-subj="filterItemsQueryBar"
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFieldText
            placeholder={intl.formatMessage({
              id: 'visTypeTimeseries.splits.filterItems.labelPlaceholder',
              defaultMessage: 'Label',
            })}
            aria-label={intl.formatMessage({
              id: 'visTypeTimeseries.splits.filterItems.labelAriaLabel',
              defaultMessage: 'Label',
            })}
            onChange={this.handleChange(model, 'label')}
            value={model.label}
            fullWidth
            data-test-subj="filterItemsLabel"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <AddDeleteButtons
            onAdd={handleAdd}
            onDelete={handleDelete}
            disableDelete={items.length < 2}
            responsive={false}
            testSubj="filterRow"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  render() {
    const { model, name } = this.props;
    if (!model[name]) return <div />;
    const rows = model[name].map(this.renderRow);
    return <div>{rows}</div>;
  }
}

FilterItemsUi.propTypes = {
  name: PropTypes.string,
  model: PropTypes.object,
  onChange: PropTypes.func,
  indexPatterns: PropTypes.string,
};

export const FilterItems = injectI18n(FilterItemsUi);

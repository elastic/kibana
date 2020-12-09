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

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import _ from 'lodash';
import { collectionActions } from './lib/collection_actions';
import { KBN_FIELD_TYPES } from '../../../../../plugins/data/public';
import { AddDeleteButtons } from './add_delete_buttons';
import { ColorPicker } from './color_picker';
import { FieldSelect } from './aggs/field_select';
import uuid from 'uuid';
import { IconSelect } from './icon_select/icon_select';
import { YesNo } from './yes_no';
import { QueryBarWrapper } from './query_bar_wrapper';
import { getDefaultQueryLanguage } from './lib/get_default_query_language';
import {
  htmlIdGenerator,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFormLabel,
  EuiSpacer,
  EuiFieldText,
  EuiTitle,
  EuiButton,
  EuiCode,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

function newAnnotation() {
  return {
    id: uuid.v1(),
    color: '#F00',
    index_pattern: '',
    time_field: '@timestamp',
    icon: 'fa-tag',
    ignore_global_filters: 1,
    ignore_panel_filters: 1,
  };
}

const RESTRICT_FIELDS = [KBN_FIELD_TYPES.DATE];

export class AnnotationsEditor extends Component {
  constructor(props) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
  }

  handleChange(item, name) {
    return (e) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      const part = {};
      part[name] = _.get(e, '[0].value', _.get(e, 'target.value'));
      handleChange(_.assign({}, item, part));
    };
  }
  handleQueryChange = (model, filter) => {
    const part = { query_string: filter };
    collectionActions.handleChange(this.props, {
      ...model,
      ...part,
    });
  };
  renderRow(row) {
    const defaults = {
      fields: '',
      template: '',
      index_pattern: '',
      query_string: { query: '', language: getDefaultQueryLanguage() },
    };
    const model = { ...defaults, ...row };
    const handleChange = (part) => {
      const fn = collectionActions.handleChange.bind(null, this.props);
      fn(_.assign({}, model, part));
    };
    const togglePanelActivation = () => {
      handleChange({
        hidden: !model.hidden,
      });
    };
    const htmlId = htmlIdGenerator(model.id);
    const handleAdd = collectionActions.handleAdd.bind(null, this.props, newAnnotation);
    const handleDelete = collectionActions.handleDelete.bind(null, this.props, model);
    const defaultIndexPattern = this.props.model.default_index_pattern;

    return (
      <div className="tvbAnnotationsEditor" key={model.id}>
        <EuiFlexGroup responsive={false}>
          <EuiFlexItem grow={false}>
            <ColorPicker
              disableTrash={true}
              onChange={handleChange}
              name="color"
              value={model.color}
            />
          </EuiFlexItem>

          <EuiFlexItem className="tvbAggRow__children">
            <EuiFlexGroup responsive={false} wrap={true} gutterSize="m">
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('indexPattern')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.annotationsEditor.indexPatternLabel"
                      defaultMessage="Index pattern"
                    />
                  }
                  helpText={
                    defaultIndexPattern &&
                    !model.index_pattern &&
                    i18n.translate('visTypeTimeseries.annotationsEditor.searchByDefaultIndex', {
                      defaultMessage: 'Default index pattern is used. To query all indexes use *',
                    })
                  }
                  fullWidth
                >
                  <EuiFieldText
                    onChange={this.handleChange(model, 'index_pattern')}
                    value={model.index_pattern}
                    placeholder={defaultIndexPattern}
                    fullWidth
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('timeField')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.annotationsEditor.timeFieldLabel"
                      defaultMessage="Time field (required)"
                    />
                  }
                  fullWidth
                >
                  <FieldSelect
                    restrict={RESTRICT_FIELDS}
                    value={model.time_field}
                    onChange={this.handleChange(model, 'time_field')}
                    indexPattern={model.index_pattern}
                    fields={this.props.fields}
                    fullWidth
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <EuiFlexGroup responsive={false} wrap={true} gutterSize="m">
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('queryString')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.annotationsEditor.queryStringLabel"
                      defaultMessage="Query string"
                    />
                  }
                  fullWidth
                >
                  <QueryBarWrapper
                    query={{
                      language: model.query_string.language || getDefaultQueryLanguage(),
                      query: model.query_string.query || '',
                    }}
                    onChange={(query) => this.handleQueryChange(model, query)}
                    indexPatterns={[model.index_pattern]}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel>
                  <FormattedMessage
                    id="visTypeTimeseries.annotationsEditor.ignoreGlobalFiltersLabel"
                    defaultMessage="Ignore global filters?"
                  />
                </EuiFormLabel>
                <EuiSpacer size="m" />
                <YesNo
                  value={model.ignore_global_filters}
                  name="ignore_global_filters"
                  onChange={handleChange}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormLabel>
                  <FormattedMessage
                    id="visTypeTimeseries.annotationsEditor.ignorePanelFiltersLabel"
                    defaultMessage="Ignore panel filters?"
                  />
                </EuiFormLabel>
                <EuiSpacer size="xs" />
                <YesNo
                  value={model.ignore_panel_filters}
                  name="ignore_panel_filters"
                  onChange={handleChange}
                />
              </EuiFlexItem>
            </EuiFlexGroup>

            <EuiSpacer size="m" />

            <EuiFlexGroup responsive={false} wrap={true} gutterSize="m">
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('icon')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.annotationsEditor.iconLabel"
                      defaultMessage="Icon (required)"
                    />
                  }
                >
                  <IconSelect value={model.icon} onChange={this.handleChange(model, 'icon')} />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('fields')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.annotationsEditor.fieldsLabel"
                      defaultMessage="Fields (required - comma separated paths)"
                    />
                  }
                  fullWidth
                >
                  <EuiFieldText
                    onChange={this.handleChange(model, 'fields')}
                    value={model.fields}
                    fullWidth
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiFormRow
                  id={htmlId('rowTemplate')}
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.annotationsEditor.rowTemplateLabel"
                      defaultMessage="Row template (required)"
                    />
                  }
                  helpText={
                    <span>
                      <FormattedMessage
                        id="visTypeTimeseries.annotationsEditor.rowTemplateHelpText"
                        defaultMessage="eg.{rowTemplateExample}"
                        values={{ rowTemplateExample: <EuiCode>{'{{field}}'}</EuiCode> }}
                      />
                    </span>
                  }
                  fullWidth
                >
                  <EuiFieldText
                    onChange={this.handleChange(model, 'template')}
                    value={model.template}
                    fullWidth
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <AddDeleteButtons
              onAdd={handleAdd}
              onDelete={handleDelete}
              togglePanelActivation={togglePanelActivation}
              isPanelActive={!model.hidden}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }

  render() {
    const { model } = this.props;
    let content;
    if (!model.annotations || !model.annotations.length) {
      const handleAdd = collectionActions.handleAdd.bind(null, this.props, newAnnotation);
      content = (
        <EuiText textAlign="center">
          <p>
            <FormattedMessage
              id="visTypeTimeseries.annotationsEditor.howToCreateAnnotationDataSourceDescription"
              defaultMessage="Click the button below to create an annotation data source."
            />
          </p>
          <EuiButton fill onClick={handleAdd}>
            <FormattedMessage
              id="visTypeTimeseries.annotationsEditor.addDataSourceButtonLabel"
              defaultMessage="Add data source"
            />
          </EuiButton>
        </EuiText>
      );
    } else {
      const annotations = model.annotations.map(this.renderRow);
      content = (
        <div>
          <EuiTitle size="s">
            <span>
              <FormattedMessage
                id="visTypeTimeseries.annotationsEditor.dataSourcesLabel"
                defaultMessage="Data sources"
              />
            </span>
          </EuiTitle>
          <EuiSpacer size="m" />

          {annotations}
        </div>
      );
    }
    return <div className="tvbAnnotationsEditor__container">{content}</div>;
  }
}

AnnotationsEditor.defaultProps = {
  name: 'annotations',
};

AnnotationsEditor.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  name: PropTypes.string,
  onChange: PropTypes.func,
  uiSettings: PropTypes.object,
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
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
  EuiSpacer,
  EuiFieldText,
  EuiTitle,
  EuiButton,
  EuiCode,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { IndexPatternSelect } from './lib/index_pattern_select';

function newAnnotation() {
  return {
    id: uuid.v1(),
    color: '#F00',
    index_pattern: '',
    time_field: '',
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
                <IndexPatternSelect
                  value={model.index_pattern}
                  indexPatternName={'index_pattern'}
                  onChange={handleChange}
                />
              </EuiFlexItem>
              <EuiFlexItem>
                <FieldSelect
                  label={
                    <FormattedMessage
                      id="visTypeTimeseries.annotationsEditor.timeFieldLabel"
                      defaultMessage="Time field (required)"
                    />
                  }
                  restrict={RESTRICT_FIELDS}
                  value={model.time_field}
                  onChange={this.handleChange(model, 'time_field')}
                  indexPattern={model.index_pattern}
                  fields={this.props.fields}
                  fullWidth
                />
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
                <EuiFormRow
                  label={i18n.translate(
                    'visTypeTimeseries.annotationsEditor.ignoreGlobalFiltersLabel',
                    {
                      defaultMessage: 'Ignore global filters?',
                    }
                  )}
                >
                  <YesNo
                    value={model.ignore_global_filters}
                    name="ignore_global_filters"
                    onChange={handleChange}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={i18n.translate(
                    'visTypeTimeseries.annotationsEditor.ignorePanelFiltersLabel',
                    {
                      defaultMessage: 'Ignore panel filters?',
                    }
                  )}
                >
                  <YesNo
                    value={model.ignore_panel_filters}
                    name="ignore_panel_filters"
                    onChange={handleChange}
                  />
                </EuiFormRow>
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

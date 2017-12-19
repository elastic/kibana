import PropTypes from 'prop-types';
import React, { Component } from 'react';
import _ from 'lodash';
import * as collectionActions from './lib/collection_actions';
import AddDeleteButtons from './add_delete_buttons';
import ColorPicker from './color_picker';
import FieldSelect from './aggs/field_select';
import uuid from 'uuid';
import IconSelect from './icon_select';
import YesNo from './yes_no';

import {
  htmlIdGenerator,
  EuiText,
} from '@elastic/eui';

function newAnnotation() {
  return {
    id: uuid.v1(),
    color: '#F00',
    index_pattern: '*',
    time_field: '@timestamp',
    icon: 'fa-tag',
    ignore_global_filters: 1,
    ignore_panel_filters: 1
  };
}

class AnnotationsEditor extends Component {

  constructor(props) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
  }

  handleChange(item, name) {
    return (e) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      const part = {};
      part[name] = _.get(e, 'value', _.get(e, 'target.value'));
      handleChange(_.assign({}, item, part));
    };
  }

  renderRow(row) {
    const defaults = { fields: '', template: '', index_pattern: '*', query_string: '' };
    const model = { ...defaults, ...row };
    const handleChange = (part) => {
      const fn = collectionActions.handleChange.bind(null, this.props);
      fn(_.assign({}, model, part));
    };
    const htmlId = htmlIdGenerator(model.id);
    const handleAdd = collectionActions.handleAdd
      .bind(null, this.props, newAnnotation);
    const handleDelete = collectionActions.handleDelete
      .bind(null, this.props, model);
    return (
      <div className="vis_editor__annotations-row" key={model.id}>
        <div className="vis_editor__annotations-color">
          <ColorPicker
            disableTrash={true}
            onChange={handleChange}
            name="color"
            value={model.color}
          />
        </div>
        <div className="vis_editor__annotations-content">
          <div className="vis_editor__row">
            <div className="vis_editor__row-item">
              <label className="vis_editor__label" htmlFor={htmlId('indexPattern')}>
                Index Pattern (required)
              </label>
              <input
                id={htmlId('indexPattern')}
                className="vis_editor__input-grows-100"
                type="text"
                onChange={this.handleChange(model, 'index_pattern')}
                value={model.index_pattern}
              />
            </div>
            <div className="vis_editor__row-item">
              <label className="vis_editor__label" htmlFor={htmlId('timeField')}>
                Time Field (required)
              </label>
              <FieldSelect
                id={htmlId('timeField')}
                restrict="date"
                value={model.time_field}
                onChange={this.handleChange(model, 'time_field')}
                indexPattern={model.index_pattern}
                fields={this.props.fields}
              />
            </div>
          </div>
          <div className="vis_editor__row">
            <div className="vis_editor__row-item">
              <label className="vis_editor__label" htmlFor={htmlId('queryString')}>
                Query String
              </label>
              <input
                id={htmlId('queryString')}
                className="vis_editor__input-grows-100"
                type="text"
                onChange={this.handleChange(model, 'query_string')}
                value={model.query_string}
              />
            </div>
            <fieldset className="vis_editor__row-item-small">
              <legend className="vis_editor__label">Ignore Global Filters</legend>
              <YesNo
                value={model.ignore_global_filters}
                name="ignore_global_filters"
                onChange={handleChange}
              />

            </fieldset>
            <fieldset className="vis_editor__row-item-small">
              <legend className="vis_editor__label">Ignore Panel Filters</legend>
              <YesNo
                value={model.ignore_panel_filters}
                name="ignore_panel_filters"
                onChange={handleChange}
              />

            </fieldset>
          </div>
          <div className="vis_editor__row">
            <div className="vis_editor__row-item">
              <label className="vis_editor__label" htmlFor={htmlId('icon')}>Icon (required)</label>
              <div className="vis_editor__item">
                <IconSelect
                  id={htmlId('icon')}
                  value={model.icon}
                  onChange={this.handleChange(model, 'icon')}
                />
              </div>
            </div>
            <div className="vis_editor__row-item">
              <label className="vis_editor__label" htmlFor={htmlId('fields')}>
                Fields (required - comma separated paths)
              </label>
              <input
                id={htmlId('fields')}
                className="vis_editor__input-grows-100"
                type="text"
                onChange={this.handleChange(model, 'fields')}
                value={model.fields}
              />
            </div>
            <div className="vis_editor__row-item">
              <label className="vis_editor__label" htmlFor={htmlId('rowTemplate')}>
                Row Template (required - eg.<code>{'{{field}}'}</code>)
              </label>
              <input
                id={htmlId('rowTemplate')}
                className="vis_editor__input-grows-100"
                type="text"
                onChange={this.handleChange(model, 'template')}
                value={model.template}
              />
            </div>
          </div>
        </div>
        <div className="vis_editor__annotations-controls">
          <AddDeleteButtons
            onAdd={handleAdd}
            onDelete={handleDelete}
          />
        </div>
      </div>
    );
  }

  render() {
    const { model } = this.props;
    let content;
    if (!model.annotations || !model.annotations.length) {
      const handleAdd = collectionActions.handleAdd
        .bind(null, this.props, newAnnotation);
      content = (
        <div className="vis_editor__annotations-missing">
          <EuiText>
            <p>Click the button below to create an annotation data source.</p>
            <button
              className="thor__button-outlined-default large"
              onClick={handleAdd}
            >Add Data Source
            </button>
          </EuiText>
        </div>
      );
    } else {
      const annotations = model.annotations.map(this.renderRow);
      content = (
        <div className="vis_editor__annotations">
          <div className="kbnTabs sm" role="tablist">
            <button
              role="tab"
              aria-selected={true}
              className="kbnTabs__tab-active"
            >
              Data Sources
            </button>
          </div>
          { annotations }
        </div>
      );
    }
    return(
      <div className="vis_editor__container">
        { content }
      </div>
    );
  }

}

AnnotationsEditor.defaultProps = {
  name: 'annotations'
};

AnnotationsEditor.propTypes = {
  fields: PropTypes.object,
  model: PropTypes.object,
  name: PropTypes.string,
  onChange: PropTypes.func
};

export default AnnotationsEditor;

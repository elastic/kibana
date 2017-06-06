import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import collectionActions from './lib/collection_actions';
import AddDeleteButtons from './add_delete_buttons';
import ColorPicker from './color_picker';
import FieldSelect from './aggs/field_select';
import uuid from 'uuid';
import IconSelect from './icon_select';
import YesNo from './yes_no';

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
            value={model.color}/>
        </div>
        <div className="vis_editor__annotations-content">
          <div className="vis_editor__row">
            <div className="vis_editor__row-item">
              <div className="vis_editor__label">Index Pattern (required)</div>
              <input
                className="vis_editor__input-grows-100"
                type="text"
                onChange={this.handleChange(model, 'index_pattern')}
                value={model.index_pattern} />
            </div>
            <div className="vis_editor__row-item">
              <div className="vis_editor__label">Time Field (required)</div>
              <FieldSelect
                restrict="date"
                value={model.time_field}
                onChange={this.handleChange(model, 'time_field')}
                indexPattern={model.index_pattern}
                fields={this.props.fields}/>
            </div>
          </div>
          <div className="vis_editor__row">
            <div className="vis_editor__row-item">
              <div className="vis_editor__label">Query String</div>
              <input
                className="vis_editor__input-grows-100"
                type="text"
                onChange={this.handleChange(model, 'query_string')}
                value={model.query_string} />
            </div>
            <div className="vis_editor__row-item-small">
              <div className="vis_editor__label">Ignore Global Filters</div>
              <YesNo
                value={model.ignore_global_filters}
                name="ignore_global_filters"
                onChange={handleChange}/>

            </div>
            <div className="vis_editor__row-item-small">
              <div className="vis_editor__label">Ignore Panel Filters</div>
              <YesNo
                value={model.ignore_panel_filters}
                name="ignore_panel_filters"
                onChange={handleChange}/>

            </div>
          </div>
          <div className="vis_editor__row">
            <div className="vis_editor__row-item">
              <div className="vis_editor__label">Icon (required)</div>
              <div className="vis_editor__item">
                <IconSelect
                  value={model.icon}
                  onChange={this.handleChange(model, 'icon')} />
              </div>
            </div>
            <div className="vis_editor__row-item">
              <div className="vis_editor__label">Fields (required - comma separated paths)</div>
              <input
                className="vis_editor__input-grows-100"
                type="text"
                onChange={this.handleChange(model, 'fields')}
                value={model.fields} />
            </div>
            <div className="vis_editor__row-item">
              <div className="vis_editor__label">Row Template (required - eg.<code>{'{{field}}'}</code>)</div>
              <input
                className="vis_editor__input-grows-100"
                type="text"
                onChange={this.handleChange(model, 'template')}
                value={model.template} />
            </div>
          </div>
        </div>
        <div className="vis_editor__annotations-controls">
          <AddDeleteButtons
            onAdd={handleAdd}
            onDelete={handleDelete} />
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
          <p>Click the button below to create an annotation data source.</p>
          <a className="thor__button-outlined-default large"
        onClick={handleAdd}>Add Data Source</a>
        </div>
      );
    } else {
      const annotations = model.annotations.map(this.renderRow);
      content = (
        <div className="vis_editor__annotations">
          <div className="kbnTabs sm">
            <div className="kbnTabs__tab-active">Data Sources</div>
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

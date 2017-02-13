import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import IndexPattern from './index_pattern';
import collectionActions from './lib/collection_actions';
import AddDeleteButtons from './add_delete_buttons';
import ColorPicker from './color_picker';
import FieldSelect from './aggs/field_select';
import uuid from 'node-uuid';
import IconSelect from './icon_select';

function newAnnotation() {
  return {
    id: uuid.v1(),
    color: '#F00',
    index_pattern: '*',
    time_field: '@timestamp',
    icon: 'fa-tag'
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
      part[name] = _.get(e, 'value', _.get(e, 'currentTarget.value'));
      handleChange(_.assign({}, item, part));
    };
  }

  renderRow(row, i, items) {
    const { fields, model } = this.props;
    const handleChange = (part) => {
      const fn = collectionActions.handleChange.bind(null, this.props);
      fn(_.assign({}, row, part));
    };
    const handleAdd = collectionActions.handleAdd
      .bind(null, this.props, newAnnotation);
    const handleDelete = collectionActions.handleDelete
      .bind(null, this.props, row);
    return (
      <div className="vis_editor__annotations-row" key={row.id}>
        <div className="vis_editor__annotations-color">
          <ColorPicker
            disableTrash={true}
            onChange={handleChange}
            name="color"
            value={row.color}/>
        </div>
        <div className="vis_editor__annotations-content">
          <div className="vis_editor__row">
            <div className="vis_editor__row-item">
              <div className="vis_editor__label">Index Pattern (required)</div>
              <input
                style={{ width: '100%' }}
                className="vis_editor__input-grows"
                type="text"
                onChange={this.handleChange(row, 'index_pattern')}
                defaultValue={row.index_pattern} />
            </div>
            <div className="vis_editor__row-item">
              <div className="vis_editor__label">Time Field (required)</div>
              <FieldSelect
                restrict="date"
                value={row.time_field}
                onChange={this.handleChange(row, 'time_field')}
                indexPattern={row.index_pattern}
                fields={this.props.fields}/>
            </div>
          </div>
          <div className="vis_editor__row">
            <div className="vis_editor__row-item">
              <div className="vis_editor__label">Query String</div>
              <input
                style={{ width: '100%' }}
                className="vis_editor__input-grows"
                type="text"
                onChange={this.handleChange(row, 'query_string')}
                defaultValue={row.query_string} />
            </div>
          </div>
          <div className="vis_editor__row">
            <div className="vis_editor__row-item">
              <div className="vis_editor__label">Icon (required)</div>
              <div className="vis_editor__item">
                <IconSelect
                  value={row.icon}
                  onChange={this.handleChange(row, 'icon')} />
              </div>
            </div>
            <div className="vis_editor__row-item">
              <div className="vis_editor__label">Fields (required - comma separated paths)</div>
              <input
                style={{ width: '100%' }}
                className="vis_editor__input-grows"
                type="text"
                onChange={this.handleChange(row, 'fields')}
                defaultValue={row.fields} />
            </div>
            <div className="vis_editor__row-item">
              <div className="vis_editor__label">Row Template (required - eg.<code>{'{{field}}'}</code>)</div>
              <input
                style={{ width: '100%' }}
                className="vis_editor__input-grows"
                type="text"
                onChange={this.handleChange(row, 'template')}
                defaultValue={row.template} />
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

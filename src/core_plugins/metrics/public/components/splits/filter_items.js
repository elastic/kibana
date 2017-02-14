import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import collectionActions from '../lib/collection_actions';
import AddDeleteButtons from '../add_delete_buttons';
import ColorPicker from '../color_picker';
import uuid from 'node-uuid';
class FilterItems extends Component {

  constructor(props) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
  }

  handleChange(item, name) {
    return (e) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      handleChange(_.assign({}, item, {
        [name]: _.get(e, 'value', _.get(e, 'target.value'))
      }));
    };
  }

  renderRow(row, i, items) {
    const{ model } = this.props;
    const handleChange = (part) => {
      const fn = collectionActions.handleChange.bind(null, this.props);
      fn(_.assign({}, row, part));
    };
    const newFilter = () => ({ color: model.color, id: uuid.v1() });
    const handleAdd = collectionActions.handleAdd
      .bind(null, this.props, newFilter);
    const handleDelete = collectionActions.handleDelete
      .bind(null, this.props, row);
    return  (
      <div className="vis_editor__split-filter-row" key={row.id}>
        <div style={{ marginRight: '10px' }}>
          <ColorPicker
            disableTrash={true}
            onChange={handleChange}
            name="color"
            value={row.color}/>
        </div>
        <div className="vis_editor__split-filter-item">
          <input
            placeholder="Filter"
            style={{ width: '100%' }}
            className="vis_editor__input-grows"
            type="text"
            onChange={this.handleChange(row, 'filter')}
            value={row.filter || ''}/>
        </div>
        <div className="vis_editor__split-filter-item">
          <input
            placeholder="Label"
            style={{ width: '100%' }}
            className="vis_editor__input-grows"
            type="text"
            onChange={this.handleChange(row, 'label')}
            value={row.label || ''}/>
        </div>
        <div className="vis_editor__split-filter-control">
          <AddDeleteButtons
            onAdd={handleAdd}
            onDelete={handleDelete}
            disableDelete={items.length < 2}/>
        </div>
      </div>
    );
  }

  render() {
    const { model, name } = this.props;
    if (!model[name]) return (<div/>);
    const rows = model[name].map(this.renderRow);
    return (
      <div className="vis_editor__split-filters">
        { rows }
      </div>
    );
  }

}

FilterItems.propTypes = {
  name: PropTypes.string,
  model: PropTypes.object,
  onChange: PropTypes.func
};

export default FilterItems;

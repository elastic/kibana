import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import AddDeleteButtons from '../add_delete_buttons';
import collectionActions from '../lib/collection_actions';
import MetricSelect from './metric_select';

class CalculationVars extends Component {

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

  renderRow(row, i, items) {
    const handleAdd = collectionActions.handleAdd.bind(null, this.props);
    const handleDelete = collectionActions.handleDelete.bind(null, this.props, row);
    return  (
      <div className="vis_editor__calc_vars-row" key={row.id}>
        <div className="vis_editor__calc_vars-name">
          <input
            placeholder="Variable Name"
            className="vis_editor__input-grows-100"
            type="text"
            onChange={this.handleChange(row, 'name')}
            value={row.name} />
        </div>
        <div className="vis_editor__calc_vars-var">
          <MetricSelect
            onChange={this.handleChange(row, 'field')}
            exclude={['percentile']}
            metrics={this.props.metrics}
            metric={this.props.model}
            value={row.field}/>
        </div>
        <div className="vis_editor__calc_vars-control">
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
      <div className="vis_editor__calc_vars">
        { rows }
      </div>
    );
  }

}

CalculationVars.defaultProps = {
  name: 'variables'
};

CalculationVars.propTypes = {
  metrics: PropTypes.array,
  model: PropTypes.object,
  name: PropTypes.string,
  onChange: PropTypes.func
};

export default CalculationVars;

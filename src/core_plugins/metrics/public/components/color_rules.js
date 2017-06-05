import React, { Component, PropTypes } from 'react';
import _ from 'lodash';
import AddDeleteButtons from './add_delete_buttons';
import Select from 'react-select';
import collectionActions from './lib/collection_actions';
import ColorPicker from './color_picker';

class ColorRules extends Component {

  constructor(props) {
    super(props);
    this.renderRow = this.renderRow.bind(this);
  }

  handleChange(item, name, cast = String) {
    return (e) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      const part = {};
      part[name] = cast(_.get(e, 'value', _.get(e, 'target.value')));
      if (part[name] === 'undefined') part[name] = undefined;
      if (part[name] === NaN) part[name] = undefined;
      handleChange(_.assign({}, item, part));
    };
  }

  renderRow(row, i, items) {
    const defaults = { value: 0 };
    const model = { ...defaults, ...row };
    const handleAdd = collectionActions.handleAdd.bind(null, this.props);
    const handleDelete = collectionActions.handleDelete.bind(null, this.props, model);
    const operatorOptions = [
      { label: '> greater than', value: 'gt' },
      { label: '>= greater than or equal', value: 'gte' },
      { label: '< less than', value: 'lt' },
      { label: '<= less than or equal', value: 'lte' },
    ];
    const handleColorChange = (part) => {
      const handleChange = collectionActions.handleChange.bind(null, this.props);
      handleChange(_.assign({}, model, part));
    };
    let secondary;
    if (!this.props.hideSecondary) {
      secondary = (
        <div className="color_rules__secondary">
          <div className="color_rules__label">and {this.props.secondaryName} to</div>
          <ColorPicker
            onChange={handleColorChange}
            name={this.props.secondaryVarName}
            value={model[this.props.secondaryVarName]}/>
        </div>
      );
    }
    return (
      <div key={model.id} className="color_rules__rule">
        <div className="color_rules__label">Set {this.props.primaryName} to</div>
        <ColorPicker
          onChange={handleColorChange}
          name={this.props.primaryVarName}
          value={model[this.props.primaryVarName]}/>
        { secondary }
        <div className="color_rules__label">if metric is</div>
        <div className="color_rules__item">
          <Select
            onChange={this.handleChange(model, 'opperator')}
            value={model.opperator}
            options={operatorOptions}/>
        </div>
        <input
          className="color_rules__input"
          type="number"
          value={model.value}
          onChange={this.handleChange(model, 'value', Number)}/>
        <div className="color_rules__control">
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
      <div className="color_rules">
        { rows }
      </div>
    );
  }

}

ColorRules.defaultProps = {
  name: 'color_rules',
  primaryName: 'background',
  primaryVarName: 'background_color',
  secondaryName: 'text',
  secondaryVarName: 'color',
  hideSecondary: false
};

ColorRules.propTypes = {
  name: PropTypes.string,
  model: PropTypes.object,
  onChange: PropTypes.func,
  primaryName: PropTypes.string,
  primaryVarName: PropTypes.string,
  secondaryName: PropTypes.string,
  secondaryVarName: PropTypes.string,
  hideSecondary: PropTypes.bool
};

export default ColorRules;

import React, {
  Component,
} from 'react';
import {
  KuiSelect,
} from '../../../../components';

class KuiSelectExample extends Component {
  state = {
    value1: '',
    value2: '',
    value3: '',
    value4: '',
    value5: '',
  };

  handleChange = (event, key) => {
    this.setState({ [key]: event.target.value });
  }

  render() {
    return (
      <div>
        <KuiSelect
          value={this.state.value1}
          onChange={event => this.handleChange(event, 'value1')}
        >
          <option value="apple" >Apple</option>
          <option value="bread" >Bread</option>
          <option value="cheese" >Cheese</option>
        </KuiSelect>
        <hr className="guideBreak"/>
        <KuiSelect
          value={this.state.value2}
          onChange={event => this.handleChange(event, 'value2')}
          isDisabled
        >
          <option>Disabled</option>
        </KuiSelect>
        <hr className="guideBreak"/>
        <KuiSelect
          value={this.state.value3}
          onChange={event => this.handleChange(event, 'value3')}
          isInvalid
        >
          <option>Invalid</option>
        </KuiSelect>
        <hr className="guideBreak"/>
        <KuiSelect
          value={this.state.value4}
          onChange={event => this.handleChange(event, 'value4')}
          size="small"
        >
          <option>Small</option>
        </KuiSelect>
        <hr className="guideBreak"/>
        <KuiSelect
          value={this.state.value5}
          onChange={event => this.handleChange(event, 'value5')}
          size="large"
        >
          <option>Large</option>
        </KuiSelect>
      </div>
    );
  }
}

export default KuiSelectExample;

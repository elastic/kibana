import React, { Component } from 'react';

export class Simple extends Component {

  constructor(props) {
    super(props);

    this.state = {
      params: props.scope.vis.params
    };

    this.handleParam1Change = this.handleParam1Change.bind(this);
  }

  handleParam1Change(evt) {
    const param1 = evt.target.value;
    this.setState((prevState) => {
      prevState.params.param1 = param1;
      return prevState;
    });
  }

  render() {
    return (
      <div>
        <div className="kuiFieldGroup">
          <div className="kuiFieldGroupSection">
            <label>
              param1
            </label>
          </div>
          <div className="kuiFieldGroupSection">
            <input
              className="kuiTextInput"
              type="text"
              value={this.state.params.param1}
              onChange={this.handleParam1Change} />
          </div>
        </div>
      </div>
    );
  }
}

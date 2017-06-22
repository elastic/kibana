import _ from 'lodash';
import React, { Component } from 'react';

export class Simple extends Component {

  constructor(props) {
    super(props);
    this.state = {
      params: _.cloneDeep(props.scope.vis.getCurrentState().params)
    };

    this.handleParam1Change = this.handleParam1Change.bind(this);
  }

  handleParam1Change(evt) {
    const params = _.cloneDeep(this.props.scope.vis.getCurrentState().params);
    params.param1 = evt.target.value;
    this.props.stageEditorParams(params);
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
              value={this.props.scope.vis.params.param1}
              onChange={this.handleParam1Change} />
          </div>
        </div>
      </div>
    );
  }
}

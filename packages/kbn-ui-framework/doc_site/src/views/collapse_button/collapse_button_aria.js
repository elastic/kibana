import React, { Component } from 'react';

import {
  KuiCollapseButton
} from '../../../../components';

import { htmlIdGenerator } from '../../../../src/services';

export default class extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isExpanded: false
    };
  }

  onToggleContent = (ev) => {
    ev.preventDefault();
    this.setState((state) => ({
      isExpanded: !state.isExpanded
    }));
  }

  render() {
    const { isExpanded } = this.state;
    const idGen = htmlIdGenerator();
    return (
      <div>
        <KuiCollapseButton
          onClick={this.onToggleContent}
          direction={isExpanded ? 'down' : 'up'}
          aria-label="Toggle panel"
          aria-expanded={isExpanded}
          aria-controls={idGen('collapsible')}
        />
        <div
          id={idGen('collapsible')}
          style={{ display: isExpanded ? 'block' : 'none' }}
        >
          Here is some collapsible content.
        </div>
      </div>
    );
  }

}

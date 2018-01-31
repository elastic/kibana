import React, { Component } from 'react';

export class Label extends Component {
  constructor() {
    super();
    this.state = { label: '', shouldShowLabel: true };
  }

  render() {
    return (
      <div
        className="tagcloud-custom-label"
        style={{ display: this.state.shouldShowLabel ? 'block' : 'none' }}
      >{this.state.label}
      </div>
    );
  }
}

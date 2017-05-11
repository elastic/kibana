import React, { Component } from 'react';

export class TermsVis extends Component {
  render() {
    return (
      <h1>{this.props.visParams.label}</h1>
    );
  }
}
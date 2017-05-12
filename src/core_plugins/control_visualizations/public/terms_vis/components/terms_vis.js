import React, { Component } from 'react';

export class TermsVis extends Component {
  render() {
    return (
      <div>
        {this.props.visParams.fields.map((field, index) =>
          <div key={index}>
            <h1>{field.label}</h1>
            <span>{field.indexPattern}</span>
          </div>
        )}
      </div>
    );
  }
}

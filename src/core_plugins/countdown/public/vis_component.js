import React from 'react';

class visComponent extends React.Component {
  render() {
    return <h1>Hello, {this.props.name}</h1>;
  }
}

export { visComponent };

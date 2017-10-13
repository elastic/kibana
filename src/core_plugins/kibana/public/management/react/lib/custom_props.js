import { Component } from 'react';
import { mapValues } from 'lodash';

export class CustomProps extends Component {
  constructor(props) {
    super(props);
    this.state = {
      props: props.props,
    };
    this.actions = mapValues(props.actions, action => () => this.setState(action()));
  }

  render() {
    return this.props.render({
      ...this.actions,
      ...this.state,
    });
  }
}

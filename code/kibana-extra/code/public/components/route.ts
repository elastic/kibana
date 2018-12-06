/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { Route as ReactRoute } from 'react-router';
import { routeChange } from '../actions';

class CSRoute extends ReactRoute {
  public componentWillMount() {
    super.componentWillMount();
    this.props.routeChange({ ...this.state.match, location: this.props.location });
  }

  public componentDidUpdate() {
    this.props.routeChange({ ...this.state.match, location: this.props.location });
  }
}

export const Route = connect(
  null,
  { routeChange }
)(CSRoute);

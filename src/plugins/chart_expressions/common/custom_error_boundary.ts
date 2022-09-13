/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

interface Props {
  onError: (error: Error) => void;
}

export class CustomErrorBoundary extends React.Component<Props> {
  onError: Props['onError'];

  constructor(props: Props) {
    super(props);
    this.onError = props.onError;
  }

  componentDidCatch(error: Error) {
    this.onError(error);
  }

  render() {
    return this.props.children;
  }
}

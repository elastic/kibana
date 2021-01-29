/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Component } from 'react';

export class Label extends Component {
  constructor() {
    super();
    this.state = { label: '', shouldShowLabel: true };
  }

  render() {
    return (
      <div
        className="tgcChart__label"
        style={{ display: this.state.shouldShowLabel ? 'block' : 'none' }}
      >
        {this.state.label}
      </div>
    );
  }
}

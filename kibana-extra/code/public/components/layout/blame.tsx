/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { GitBlame } from '../../../common/git_blame';

interface Props {
  blames: GitBlame[];
  lineHeight: number;
}

export class Blame extends React.Component<Props> {
  public render() {
    return this.props.blames.map((blame: GitBlame, index) => (
      <div key={index} style={{ height: blame.lines * this.props.lineHeight }}>
        <span>{blame.commit.message}</span>
        <span>{blame.commit.date}</span>
      </div>
    ));
  }
}

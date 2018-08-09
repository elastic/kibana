/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink } from '@elastic/eui';
import React from 'react';

interface Props {
  baseUri: string;
  paths: string[];
}

export class FileListDropdown extends React.Component<Props> {
  constructor(props: Props, context: any) {
    super(props, context);
  }
  public render() {
    const path = this.props.paths[this.props.paths.length - 1];
    return (
      <EuiLink
        className={'euiBreadcrumb'}
        href={`${this.props.baseUri}${this.props.paths.join('/')}`}
      >
        {path}
      </EuiLink>
    );
  }
  /*public render() {
    const path = this.props.paths[this.props.paths.length - 1];
    return (
        <EuiPopover
        button={<span className="breadcrumbs">{path}</span>}>
      {path}
      </EuiPopover>
    );
  }*/
}

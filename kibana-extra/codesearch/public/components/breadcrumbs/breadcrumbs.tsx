/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/* tslint:disable:jsx-no-multiline-js */
import React from 'react';

import { EuiPopover } from '@elastic/eui';
import { Link } from 'react-router-dom';

interface Props {
  pathSegments: string[];
  directories: string[][];
  basePath: string;
}

const FileList = props => (
  <ul onMouseOut={props.onMouseOut}>
    {props.files.map(file => (
      <li key={file}>
        <Link to={`${props.basePath}/${file}`}>{file}</Link>
      </li>
    ))}
  </ul>
);

export class Breadcrumbs extends React.PureComponent<Props> {
  public state = {
    openPath: null,
  };

  public getMouseOverHandler = path => () => {
    this.setState({ openPath: path });
  };

  public closePopover = () => {
    this.setState({ openPath: null });
  };

  public render() {
    return (
      <div className="breadcrumbsContainer">
        {this.props.pathSegments.slice(0, -1).map((path: string, index: number) => (
          <EuiPopover
            closePopover={this.closePopover}
            isOpen={this.state.openPath === this.props.pathSegments.slice(0, index).join('/')}
            key={this.props.pathSegments.slice(0, index).join('/')}
            button={
              <span
                key={path}
                className="breadcrumbs"
                onMouseOver={this.getMouseOverHandler(
                  this.props.pathSegments.slice(0, index).join('/')
                )}
              >
                {path}/
              </span>
            }
          >
            <FileList
              onMouseOut={this.closePopover}
              files={this.props.directories[index] || []}
              basePath={`${this.props.basePath}${this.props.pathSegments
                .slice(0, index + 1)
                .join('/')}`}
            />
          </EuiPopover>
        ))}
      </div>
    );
  }
}

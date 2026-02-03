/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { css } from '@emotion/react';
import React from 'react';
import type { MountPoint } from '@kbn/core-mount-utils-browser';

interface Props {
  extension?: MountPoint<HTMLDivElement>;
  display?: 'block' | 'inlineBlock';
  containerClassName?: string;
}

export class HeaderExtension extends React.Component<Props> {
  private readonly ref = React.createRef<HTMLDivElement>();
  private unrender?: () => void;

  public componentDidMount() {
    this.renderExtension();
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.props.extension === prevProps.extension) {
      return;
    }

    this.unrenderExtension();
    this.renderExtension();
  }

  public componentWillUnmount() {
    this.unrenderExtension();
  }

  public render() {
    return (
      <div
        css={css`
          &:empty {
            // empty containers should be removed from the layout flow
            display: contents;
          }
        `}
        ref={this.ref}
        className={this.props.containerClassName}
        style={{ display: this.props.display === 'inlineBlock' ? 'inline-block' : undefined }}
      />
    );
  }

  private renderExtension() {
    if (!this.ref.current) {
      throw new Error('<HeaderExtension /> mounted without ref');
    }

    if (this.props.extension) {
      this.unrender = this.props.extension(this.ref.current);
    }
  }

  private unrenderExtension() {
    if (this.unrender) {
      this.unrender();
      this.unrender = undefined;
    }
  }
}

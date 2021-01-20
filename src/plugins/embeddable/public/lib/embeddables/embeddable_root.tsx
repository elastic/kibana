/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { EmbeddableInput, IEmbeddable } from './i_embeddable';

interface Props {
  embeddable?: IEmbeddable;
  loading?: boolean;
  error?: string;
  input?: EmbeddableInput;
}

export class EmbeddableRoot extends React.Component<Props> {
  private root?: React.RefObject<HTMLDivElement>;
  private alreadyMounted: boolean = false;

  constructor(props: Props) {
    super(props);

    this.root = React.createRef();
  }

  public componentDidMount() {
    if (this.root && this.root.current && this.props.embeddable) {
      this.alreadyMounted = true;
      this.props.embeddable.render(this.root.current);
    }
  }

  public componentDidUpdate(prevProps?: Props) {
    let justRendered = false;
    if (this.root && this.root.current && this.props.embeddable && !this.alreadyMounted) {
      this.alreadyMounted = true;
      this.props.embeddable.render(this.root.current);
      justRendered = true;
    }

    if (
      !justRendered &&
      this.root &&
      this.root.current &&
      this.props.embeddable &&
      this.alreadyMounted &&
      this.props.input &&
      prevProps?.input !== this.props.input
    ) {
      this.props.embeddable.updateInput(this.props.input);
    }
  }

  public shouldComponentUpdate(newProps: Props) {
    return Boolean(
      newProps.error !== this.props.error ||
        newProps.loading !== this.props.loading ||
        newProps.embeddable !== this.props.embeddable ||
        (this.root && this.root.current && newProps.embeddable && !this.alreadyMounted) ||
        newProps.input !== this.props.input
    );
  }

  public render() {
    return (
      <React.Fragment>
        <div ref={this.root} />
        {this.props.loading && <EuiLoadingSpinner data-test-subj="embedSpinner" />}
        {this.props.error && <EuiText data-test-subj="embedError">{this.props.error}</EuiText>}
      </React.Fragment>
    );
  }
}

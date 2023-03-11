/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ReactNode } from 'react';
import { EuiLoadingSpinner } from '@elastic/eui';
import { EuiText } from '@elastic/eui';
import { isPromise } from '@kbn/std';
import { MaybePromise } from '@kbn/utility-types';
import { EmbeddableInput, EmbeddableOutput, IEmbeddable } from './i_embeddable';
import { EmbeddableErrorHandler } from './embeddable_error_handler';

interface Props {
  embeddable?: IEmbeddable<EmbeddableInput, EmbeddableOutput, MaybePromise<ReactNode>>;
  loading?: boolean;
  error?: string;
  input?: EmbeddableInput;
}

interface State {
  node?: ReactNode;
}

export class EmbeddableRoot extends React.Component<Props, State> {
  private root?: React.RefObject<HTMLDivElement>;
  private alreadyMounted: boolean = false;

  constructor(props: Props) {
    super(props);

    this.root = React.createRef();
    this.state = {};
  }

  private updateNode = (node: MaybePromise<ReactNode>) => {
    if (isPromise(node)) {
      node.then(this.updateNode);

      return;
    }

    this.setState({ node });
  };

  public componentDidMount() {
    if (!this.root?.current || !this.props.embeddable) {
      return;
    }

    this.alreadyMounted = true;
    this.updateNode(this.props.embeddable.render(this.root.current) ?? undefined);
  }

  public componentDidUpdate(prevProps?: Props) {
    let justRendered = false;
    if (this.root?.current && this.props.embeddable && !this.alreadyMounted) {
      this.alreadyMounted = true;
      this.updateNode(this.props.embeddable.render(this.root.current) ?? undefined);
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

  public shouldComponentUpdate({ embeddable, error, input, loading }: Props, { node }: State) {
    return Boolean(
      error !== this.props.error ||
        loading !== this.props.loading ||
        embeddable !== this.props.embeddable ||
        (this.root && this.root.current && embeddable && !this.alreadyMounted) ||
        input !== this.props.input ||
        node !== this.state.node
    );
  }

  public render() {
    return (
      <React.Fragment>
        <div ref={this.root}>{this.state.node}</div>
        {this.props.loading && <EuiLoadingSpinner data-test-subj="embedSpinner" />}
        {this.props.error && (
          <EmbeddableErrorHandler embeddable={this.props.embeddable} error={this.props.error}>
            {({ message }) => <EuiText data-test-subj="embedError">{message}</EuiText>}
          </EmbeddableErrorHandler>
        )}
      </React.Fragment>
    );
  }
}

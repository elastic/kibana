/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import * as Rx from 'rxjs';
import { IEmbeddable, EmbeddableInput, EmbeddableOutput } from './i_embeddable';

export const withEmbeddableSubscription = <
  I extends EmbeddableInput,
  O extends EmbeddableOutput,
  E extends IEmbeddable<I, O> = IEmbeddable<I, O>,
  ExtraProps = {}
>(
  WrappedComponent: React.ComponentType<{ input: I; output: O; embeddable: E } & ExtraProps>
): React.ComponentType<{ embeddable: E } & ExtraProps> =>
  class WithEmbeddableSubscription extends React.Component<
    { embeddable: E } & ExtraProps,
    { input: I; output: O }
  > {
    private subscription?: Rx.Subscription;
    private mounted: boolean = false;

    constructor(props: { embeddable: E } & ExtraProps) {
      super(props);
      this.state = {
        input: this.props.embeddable.getInput(),
        output: this.props.embeddable.getOutput(),
      };
    }

    componentDidMount() {
      this.mounted = true;

      this.subscription = Rx.merge(
        this.props.embeddable.getOutput$(),
        this.props.embeddable.getInput$()
      ).subscribe(() => {
        if (this.mounted) {
          this.setState({
            input: this.props.embeddable.getInput(),
            output: this.props.embeddable.getOutput(),
          });
        }
      });
    }

    componentWillUnmount() {
      this.mounted = false;
      if (this.subscription) {
        this.subscription.unsubscribe();
      }
    }

    render() {
      return (
        <WrappedComponent input={this.state.input} output={this.state.output} {...this.props} />
      );
    }
  };

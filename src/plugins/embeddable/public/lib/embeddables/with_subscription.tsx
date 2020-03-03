/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import React from 'react';
import * as Rx from 'rxjs';
import { IEmbeddable, EmbeddableInput, EmbeddableOutput } from './i_embeddable';

export const withEmbeddableSubscription = <
  I extends EmbeddableInput,
  O extends EmbeddableOutput,
  E extends IEmbeddable<I, O> = IEmbeddable<I, O>
>(
  WrappedComponent: React.ComponentType<{ input: I; output: O; embeddable: E }>
): React.ComponentType<{ embeddable: E }> =>
  class WithEmbeddableSubscription extends React.Component<
    { embeddable: E },
    { input: I; output: O }
  > {
    private subscription?: Rx.Subscription;
    private mounted: boolean = false;

    constructor(props: { embeddable: E }) {
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
        <WrappedComponent
          input={this.state.input}
          output={this.state.output}
          embeddable={this.props.embeddable}
        />
      );
    }
  };

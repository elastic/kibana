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
import { Subscription } from 'rxjs';
import { HelloWorldEmbeddable } from './hello_world_embeddable';

interface Props {
  helloWorldEmbeddable: HelloWorldEmbeddable;
}

interface State {
  fullName: string;
}

export class HelloWorldEmbeddableComponent extends React.Component<Props, State> {
  private subscription?: Subscription;
  private mounted: boolean = false;

  constructor(props: Props) {
    super(props);
    this.state = {
      fullName: '',
    };
  }

  componentDidMount() {
    this.mounted = true;
    this.subscription = this.props.helloWorldEmbeddable.getOutput$().subscribe(() => {
      if (this.mounted) {
        this.setState({ fullName: this.props.helloWorldEmbeddable.getOutput().name });
      }
    });
  }

  componentWillUnmount() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.mounted = false;
  }

  render() {
    return (
      <div>
        Hello World!
        <br /> Sincerly, ${this.state.fullName}
      </div>
    );
  }
}

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

import PropTypes from 'prop-types';
import React, { Component, ComponentClass, ComponentType } from 'react';
import { UICapabilities } from '../..';

function getDisplayName(component: ComponentType<any>) {
  return component.displayName || component.name || 'Component';
}

interface InjectedProps {
  uiCapabilities: UICapabilities;
}

export function injectUICapabilities<P>(
  WrappedComponent: ComponentType<P & InjectedProps>
): ComponentClass<Pick<P, Exclude<keyof P, keyof InjectedProps>>> & {
  WrappedComponent: ComponentType<P & InjectedProps>;
} {
  class InjectUICapabilities extends Component<P, any> {
    public static displayName = `InjectUICapabilities(${getDisplayName(WrappedComponent)})`;

    public static WrappedComponent: ComponentType<P & InjectedProps> = WrappedComponent;

    public static contextTypes = {
      uiCapabilities: PropTypes.object.isRequired,
    };

    constructor(props: any, context: any) {
      super(props, context);
    }

    public render() {
      return (
        <WrappedComponent {...this.props} {...{ uiCapabilities: this.context.uiCapabilities }} />
      );
    }
  }
  return InjectUICapabilities;
}

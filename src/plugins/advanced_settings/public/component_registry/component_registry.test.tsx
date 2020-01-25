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

import React, { FunctionComponent } from 'react';
import {
  tryRegisterSettingsComponent,
  registerSettingsComponent,
  getSettingsComponent,
} from './component_registry';

describe('tryRegisterSettingsComponent', () => {
  it('should allow a component to be registered', () => {
    const component = () => <div />;
    expect(tryRegisterSettingsComponent('tryTest1', component)).toEqual(true);
  });

  it('should return false if the component is already registered, and not allow an override', () => {
    const component = () => <div />;
    expect(tryRegisterSettingsComponent('tryTest2', component)).toEqual(true);

    const updatedComponent = () => <div />;
    expect(tryRegisterSettingsComponent('tryTest2', updatedComponent)).toEqual(false);
    expect(getSettingsComponent('tryTest2')).toBe(component);
  });
});

describe('registerSettingsComponent', () => {
  it('should allow a component to be registered', () => {
    const component = () => <div />;
    registerSettingsComponent('test', component);
  });

  it('should disallow registering a component with a duplicate id', () => {
    const component = () => <div />;
    registerSettingsComponent('test2', component);
    expect(() => registerSettingsComponent('test2', () => <span />)).toThrowErrorMatchingSnapshot();
  });

  it('should allow a component to be overriden', () => {
    const component = () => <div />;
    registerSettingsComponent('test3', component);

    const anotherComponent = () => <span />;
    registerSettingsComponent('test3', anotherComponent, true);

    expect(getSettingsComponent('test3')).toBe(anotherComponent);
  });

  it('should set a displayName for the component', () => {
    const component = () => <div />;
    registerSettingsComponent('display_name_component', component);
    expect((component as FunctionComponent).displayName).toEqual('display_name_component');
  });
});

describe('getSettingsComponent', () => {
  it('should allow a component to be retrieved', () => {
    const component = () => <div />;
    registerSettingsComponent('test4', component);
    expect(getSettingsComponent('test4')).toBe(component);
  });

  it('should throw an error when requesting a component that does not exist', () => {
    expect(() => getSettingsComponent('does not exist')).toThrowErrorMatchingSnapshot();
  });
});

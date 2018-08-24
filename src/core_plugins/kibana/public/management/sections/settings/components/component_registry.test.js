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

import { tryRegisterSettingsComponent, registerSettingsComponent, getSettingsComponent } from './component_registry';


describe('tryRegisterSettingsComponent', () => {
  it('should allow a component to be registered', () => {
    const component = Symbol();
    expect(tryRegisterSettingsComponent('tryTest1', component)).toEqual(true);
  });

  it('should return false if the component is already registered, and not allow an override', () => {
    const component = Symbol();
    expect(tryRegisterSettingsComponent('tryTest2', component)).toEqual(true);

    const updatedComponent = Symbol;
    expect(tryRegisterSettingsComponent('tryTest2', updatedComponent)).toEqual(false);
    expect(getSettingsComponent('tryTest2')).toEqual(component);
  });
});

describe('registerSettingsComponent', () => {
  it('should allow a component to be registered', () => {
    const component = Symbol();
    registerSettingsComponent('test', component);
  });

  it('should disallow registering a component with a duplicate id', () => {
    const component = Symbol();
    registerSettingsComponent('test2', component);
    expect(() => registerSettingsComponent('test2', 'some other component')).toThrowErrorMatchingSnapshot();
  });

  it('should allow a component to be overriden', () => {
    const component = Symbol();
    registerSettingsComponent('test3', component);
    registerSettingsComponent('test3', 'another component', true);

    expect(getSettingsComponent('test3')).toEqual('another component');
  });
});

describe('getSettingsComponent', () => {
  it('should allow a component to be retrieved', () => {
    const component = Symbol();
    registerSettingsComponent('test4', component);
    expect(getSettingsComponent('test4')).toEqual(component);
  });

  it('should throw an error when requesting a component that does not exist', () => {
    expect(() => getSettingsComponent('does not exist')).toThrowErrorMatchingSnapshot();
  });
});
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

import { BaseVisTypeProvider, AngularVisTypeProvider, ReactVisTypeProvider, VislibVisTypeProvider } from './vis_types';

export const VisFactoryProvider = (Private) => {
  const AngularVisType = Private(AngularVisTypeProvider);
  const VislibVisType = Private(VislibVisTypeProvider);
  const BaseVisType = Private(BaseVisTypeProvider);
  const ReactVisType = Private(ReactVisTypeProvider);

  return {
    createBaseVisualization: (config) => {
      return new BaseVisType(config);
    },
    createAngularVisualization: (config) => {
      return new AngularVisType(config);
    },
    createReactVisualization: (config) => {
      return new ReactVisType(config);
    },
    createVislibVisualization: (config) => {
      return new VislibVisType(config);
    }
  };
};

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

import { FunctionComponent } from 'react';
import { ESRequestResult } from '../../hooks/use_send_current_request_to_es/send_request_to_es';

export type BaseResponseType =
  | 'application/json'
  | 'text/csv'
  | 'text/tab-separated-values'
  | 'text/plain'
  | 'application/yaml'
  | 'unknown';

export interface OutputPaneVisualisationProps<T = ESRequestResult> {
  data: T;
}

export interface OutputPaneVisualisationDescriptor<T = ESRequestResult> {
  // i18n friendly name
  title: string;
  // A way to test if the visualisation is compatible with the data
  isCompatible: (result: { data: unknown[]; type: BaseResponseType }) => boolean;
  Component: FunctionComponent<OutputPaneVisualisationProps<T>>;
}

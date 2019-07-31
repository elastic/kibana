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
import { IndexPattern } from 'src/legacy/core_plugins/data/public';

export interface DocViewerTab {
  component?: JSX.Element;
  directive?: AngularDirective;
  render?: DockViewerTabRenderFunc;
  title: string;
}

export type DockViewerTabRenderFunc = (
  domeNode: unknown,
  renderProps: DocViewerTabRenderProps
) => () => void;

export interface DocViewerTabRenderProps {
  columns: string[];
  filter: (field: string, value: string | number, operation: string) => void;
  hit: Record<string, string | number | Record<string, unknown>>;
  indexPattern: IndexPattern;
  onAddColumn: (columnName: string) => void;
  onRemoveColumn: (columnName: string) => void;
}

export interface AngularScope {
  $new: () => AngularScope;
  $digest: () => void;
  $destroy: () => void;
}

export interface AngularDirective {
  controller: (scope: AngularScope) => void;
  template: string;
}

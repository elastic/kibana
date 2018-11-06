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

import { Filter } from 'ui/filter_bar/filters/index';

export class PhraseFilter implements Filter {
  public field: string;
  public value: string | number;
  public disabled: boolean;
  public index: string;
  public negate: boolean;

  constructor({
    field,
    value,
    index,
    disabled = false,
    negate = false,
  }: {
    field: string;
    value: string | number;
    index: string;
    disabled?: boolean;
    negate?: boolean;
  }) {
    this.field = field;
    this.value = value;
    this.disabled = disabled;
    this.index = index;
    this.negate = negate;
  }

  public getDisplayText = () => {
    return `${this.field} : ${this.value}`;
  };
}

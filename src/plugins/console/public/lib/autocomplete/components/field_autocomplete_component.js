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
import _ from 'lodash';
import mappings from '../../mappings/mappings';
import { ListComponent } from './list_component';

function FieldGenerator(context) {
  return _.map(mappings.getFields(context.indices, context.types), function (field) {
    return { name: field.name, meta: field.type };
  });
}

export class FieldAutocompleteComponent extends ListComponent {
  constructor(name, parent, multiValued) {
    super(name, FieldGenerator, parent, multiValued);
  }
  validateTokens(tokens) {
    if (!this.multiValued && tokens.length > 1) {
      return false;
    }

    return !_.find(tokens, function (token) {
      return token.match(/[^\w.?*]/);
    });
  }

  getDefaultTermMeta() {
    return 'field';
  }

  getContextKey() {
    return 'fields';
  }
}

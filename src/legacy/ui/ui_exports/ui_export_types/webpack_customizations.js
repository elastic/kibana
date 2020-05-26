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

import { isAbsolute } from 'path';

import { escapeRegExp } from 'lodash';

import { flatConcatAtType, mergeAtType } from './reduce';
import { alias, wrap, uniqueKeys, mapSpec } from './modify_reduce';

export const __globalImportAliases__ = wrap(
  alias('webpackAliases'),
  uniqueKeys('__globalImportAliases__'),
  mergeAtType
);
export const __bundleProvider__ = wrap(alias('uiBundleProviders'), flatConcatAtType);
export const __webpackPluginProvider__ = wrap(alias('webpackPluginProviders'), flatConcatAtType);
export const noParse = wrap(
  alias('webpackNoParseRules'),
  mapSpec((rule) => {
    if (typeof rule === 'string') {
      return new RegExp(`${isAbsolute(rule) ? '^' : ''}${escapeRegExp(rule)}`);
    }

    if (rule instanceof RegExp) {
      return rule;
    }

    throw new Error('Expected noParse rule to be a string or regexp');
  }),
  flatConcatAtType
);

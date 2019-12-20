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

/**
 * Nothing to see here!
 *
 * Index Patterns have moved to the data plugin, and are being re-exported
 * from ui/index_patterns for backwards compatibility.
 */

import { indexPatterns, IFieldType } from '../../../../plugins/data/public';

// static code
export const INDEX_PATTERN_ILLEGAL_CHARACTERS = indexPatterns.ILLEGAL_CHARACTERS;
export const INDEX_PATTERN_ILLEGAL_CHARACTERS_VISIBLE = indexPatterns.ILLEGAL_CHARACTERS_VISIBLE;
export const ILLEGAL_CHARACTERS = indexPatterns.ILLEGAL_CHARACTERS_KEY;
export const CONTAINS_SPACES = indexPatterns.CONTAINS_SPACES_KEY;
export const validateIndexPattern = indexPatterns.validate;
export const flattenHitWrapper = indexPatterns.flattenHitWrapper;
export const getFromSavedObject = indexPatterns.getFromSavedObject;
export const getRoutes = indexPatterns.getRoutes;

// types
export { IFieldType as FieldType };
export { Field, IFieldList, IndexPattern } from '../../../../plugins/data/public';

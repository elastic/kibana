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

import { flatConcatValuesAtType } from './reduce';
import { mapSpec, alias, wrap } from './modify_reduce';

/**
 *  Reducer "preset" that merges named "first-class" appExtensions by
 *  converting them into objects and then concatenating the values of those objects
 *  @type {Function}
 */
const appExtension = wrap(
  mapSpec((spec, type) => ({ [type]: spec })),
  alias('appExtensions'),
  flatConcatValuesAtType
);

// plain extension groups produce lists of modules that will be required by the entry
// files to include extensions of specific types into specific apps
export const visTypes = appExtension;
export const visResponseHandlers = appExtension;
export const visRequestHandlers = appExtension;
export const visEditorTypes = appExtension;
export const autocompleteProviders = appExtension;
export const savedObjectTypes = appExtension;
export const embeddableActions = appExtension;
export const embeddableFactories = appExtension;
export const contextMenuActions = appExtension;
export const fieldFormats = appExtension;
export const fieldFormatEditors = appExtension;
export const chromeNavControls = appExtension;
export const navbarExtensions = appExtension;
export const managementSections = appExtension;
export const indexManagement = appExtension;
export const devTools = appExtension;
export const docViews = appExtension;
export const hacks = appExtension;
export const home = appExtension;
export const canvas = appExtension;
export const inspectorViews = appExtension;
export const search = appExtension;
export const shareContextMenuExtensions = appExtension;
// Add a visualize app extension that should be used for visualize specific stuff
export const visualize = appExtension;
export const interpreter = appExtension;

// aliases visTypeEnhancers to the visTypes group
export const visTypeEnhancers = wrap(alias('visTypes'), appExtension);

// adhoc extension groups can define new extension groups on the fly
// so that plugins could concat their own
export const aliases = flatConcatValuesAtType;

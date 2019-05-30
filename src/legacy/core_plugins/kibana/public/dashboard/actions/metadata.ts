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

/* eslint-disable @typescript-eslint/no-empty-interface */

import { createAction } from 'redux-actions';
import { KibanaAction } from '../../selectors/types';

export enum MetadataActionTypeKeys {
  UPDATE_DESCRIPTION = 'UPDATE_DESCRIPTION',
  UPDATE_TITLE = 'UPDATE_TITLE',
}

export type UpdateTitleActionPayload = string;

export interface UpdateTitleAction
  extends KibanaAction<MetadataActionTypeKeys.UPDATE_TITLE, UpdateTitleActionPayload> {}

export type UpdateDescriptionActionPayload = string;

export interface UpdateDescriptionAction
  extends KibanaAction<MetadataActionTypeKeys.UPDATE_DESCRIPTION, UpdateDescriptionActionPayload> {}

export type MetadataActions = UpdateDescriptionAction | UpdateTitleAction;

export const updateDescription = createAction<string>(MetadataActionTypeKeys.UPDATE_DESCRIPTION);
export const updateTitle = createAction<string>(MetadataActionTypeKeys.UPDATE_TITLE);

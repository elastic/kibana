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

import { Reducer } from 'redux';
import {
  MetadataActions,
  MetadataActionTypeKeys,
  UpdateDescriptionActionPayload,
  UpdateTitleActionPayload,
} from '../actions';
import { DashboardMetadata } from '../selectors';

const updateTitle = (
  metadata: DashboardMetadata,
  title: UpdateTitleActionPayload
) => ({
  ...metadata,
  title,
});

const updateDescription = (
  metadata: DashboardMetadata,
  description: UpdateDescriptionActionPayload
) => ({
  ...metadata,
  description,
});

export const metadataReducer: Reducer<DashboardMetadata> = (
  metadata = {
    description: '',
    title: '',
  },
  action
): DashboardMetadata => {
  switch ((action as MetadataActions).type) {
    case MetadataActionTypeKeys.UPDATE_TITLE:
      return updateTitle(metadata, action.payload);
    case MetadataActionTypeKeys.UPDATE_DESCRIPTION:
      return updateDescription(metadata, action.payload);
    default:
      return metadata;
  }
};

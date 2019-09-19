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

import React, { FunctionComponent, useEffect, useState, Fragment } from 'react';
import { SavedQueryFilterParams } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { SavedQueryService } from '../../../search/search_bar/lib/saved_query_service';

type SavedQueryParamsPartial = Partial<SavedQueryFilterParams>;

interface Props {
  showSaveQuery?: boolean;
  value?: SavedQueryParamsPartial; // is this an object containing a savedQuery, the esQueryConfig and the indexPattern or just the string version of the SQ name?
  savedQueryService: SavedQueryService;
  onChange: (params: SavedQueryParamsPartial) => void;
}

export const SavedQueryEditorUI: FunctionComponent<Props> = ({
  showSaveQuery,
  value,
  savedQueryService,
  onChange,
}) => {
  return (
    <ul>
      <li key={1}>Saved Query 1</li>
      <li key={2}>Saved Query 2</li>
      <li key={3}>Saved Query 3</li>
      <li key={4}>Saved Query 4</li>
    </ul>
  );
};

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

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent, useEffect, useState, Fragment } from 'react';
import { sortBy } from 'lodash';
import { SavedQueryFilterParams } from '@kbn/es-query';
import { UiSettingsClientContract } from 'src/core/public';
import { IndexPattern } from '../../../index_patterns';
import { SavedQuery } from '../../../search/search_bar/index';
import { SavedQueryService } from '../../../search/search_bar/lib/saved_query_service';

const pageCount = 50;

type SavedQueryParamsPartial = Partial<SavedQueryFilterParams>;

interface Props {
  indexPattern: IndexPattern;
  uiSettings: UiSettingsClientContract;
  showSaveQuery?: boolean;
  loadedSavedQuery?: SavedQuery;
  savedQueryService: SavedQueryService;
  onLoad: (savedQuery: SavedQuery) => void;
  onChange: (params: SavedQueryParamsPartial) => void;
}

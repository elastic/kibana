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

import React from 'react';
import { npStart } from 'ui/new_platform';
import { IconType } from '@elastic/eui';
import { SavedObjectAttributes } from 'src/core/server';
import { SimpleSavedObject } from 'src/core/public';
import { SavedObjectFinder as SavedObjectFinderNP } from '../../../../../plugins/kibana_react/public';

/**
 * DO NOT USE THIS COMPONENT, IT IS DEPRECATED.
 * Use the one in `src/plugins/kibana_react` instead.
 */

export interface SavedObjectMetaData<T extends SavedObjectAttributes> {
  type: string;
  name: string;
  getIconForSavedObject(savedObject: SimpleSavedObject<T>): IconType;
  getTooltipForSavedObject?(savedObject: SimpleSavedObject<T>): string;
  showSavedObject?(savedObject: SimpleSavedObject<T>): boolean;
}

interface BaseSavedObjectFinder {
  /**
   * @deprecated
   *
   * Use component in `src/plugins/kibana_react` instead.
   */
  onChoose?: (
    id: SimpleSavedObject<SavedObjectAttributes>['id'],
    type: SimpleSavedObject<SavedObjectAttributes>['type'],
    name: string
  ) => void;
  /**
   * @deprecated
   *
   * Use component in `src/plugins/kibana_react` instead.
   */
  noItemsMessage?: React.ReactNode;
  /**
   * @deprecated
   *
   * Use component in `src/plugins/kibana_react` instead.
   */
  savedObjectMetaData: Array<SavedObjectMetaData<SavedObjectAttributes>>;
  /**
   * @deprecated
   *
   * Use component in `src/plugins/kibana_react` instead.
   */
  showFilter?: boolean;
}

interface SavedObjectFinderFixedPage extends BaseSavedObjectFinder {
  /**
   * @deprecated
   *
   * Use component in `src/plugins/kibana_react` instead.
   */
  initialPageSize?: undefined;
  /**
   * @deprecated
   *
   * Use component in `src/plugins/kibana_react` instead.
   */
  fixedPageSize: number;
}

interface SavedObjectFinderInitialPageSize extends BaseSavedObjectFinder {
  /**
   * @deprecated
   *
   * Use component in `src/plugins/kibana_react` instead.
   */
  initialPageSize?: 5 | 10 | 15 | 25;
  /**
   * @deprecated
   *
   * Use component in `src/plugins/kibana_react` instead.
   */
  fixedPageSize?: undefined;
}
type SavedObjectFinderProps = SavedObjectFinderFixedPage | SavedObjectFinderInitialPageSize;

export const SavedObjectFinder: React.FC<SavedObjectFinderProps> = props => (
  <SavedObjectFinderNP
    savedObjects={npStart.core.savedObjects}
    uiSettings={npStart.core.uiSettings}
    {...props}
  />
);

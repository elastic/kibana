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
import { I18nStart } from 'kibana/public';
import { i18n } from '@kbn/i18n';
import { SavedObjectSaveModal, showSaveModal } from '../../../../../saved_objects/public';
import { SavedSearch } from '../../../saved_searches';

export async function onSaveSearch(
  savedSearch: SavedSearch,
  saveDataSource: (args: {
    confirmOverwrite: boolean;
    isTitleDuplicateConfirmed: boolean;
    onTitleDuplicate: () => void;
  }) => Promise<{ id: string; error: string }>,
  onSaveDataSourceSuccess: () => void,
  i18nStart: I18nStart
) {
  const onSave = async ({
    newTitle,
    newCopyOnSave,
    isTitleDuplicateConfirmed,
    onTitleDuplicate,
  }: {
    newTitle: string;
    newCopyOnSave: boolean;
    isTitleDuplicateConfirmed: boolean;
    onTitleDuplicate: () => void;
  }) => {
    const currentTitle = savedSearch.title;
    savedSearch.title = newTitle;
    savedSearch.copyOnSave = newCopyOnSave;
    const saveOptions = {
      confirmOverwrite: false,
      isTitleDuplicateConfirmed,
      onTitleDuplicate,
    };
    const response = await saveDataSource(saveOptions);
    // If the save wasn't successful, put the original values back.
    if (!response.id || response.error) {
      savedSearch.title = currentTitle;
    } else {
      onSaveDataSourceSuccess();
    }
    return response;
  };

  const saveModal = (
    <SavedObjectSaveModal
      onSave={onSave}
      onClose={() => {}}
      title={savedSearch.title}
      showCopyOnSave={!!savedSearch.id}
      objectType="search"
      description={i18n.translate('discover.localMenu.saveSaveSearchDescription', {
        defaultMessage:
          'Save your Discover search so you can use it in visualizations and dashboards',
      })}
      showDescription={false}
    />
  );
  showSaveModal(saveModal, i18nStart.Context);
}

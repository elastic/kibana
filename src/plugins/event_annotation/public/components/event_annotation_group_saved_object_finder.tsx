/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { SavedObjectFinderUi } from '@kbn/saved-objects-plugin/public';
import { CoreStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { SavedObjectCommon } from '@kbn/saved-objects-plugin/common';
import { EVENT_ANNOTATION_GROUP_TYPE } from '../../common';

export const EventAnnotationGroupSavedObjectFinder = ({
  uiSettings,
  http,
  fixedPageSize = 10,
  onChoose,
}: {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  fixedPageSize: number;
  onChoose: (value: {
    id: string;
    type: string;
    fullName: string;
    savedObject: SavedObjectCommon<unknown>;
  }) => void;
}) => {
  return (
    <SavedObjectFinderUi
      key="searchSavedObjectFinder"
      fixedPageSize={fixedPageSize}
      onChoose={(id, type, fullName, savedObject) => {
        onChoose({ id, type, fullName, savedObject });
      }}
      showFilter={false}
      noItemsMessage={
        <FormattedMessage
          id="eventAnnotation.eventAnnotationGroup.savedObjectFinder.notFoundLabel"
          defaultMessage="No matching annotation groups found."
        />
      }
      savedObjectMetaData={savedObjectMetaData}
      uiSettings={uiSettings}
      http={http}
    />
  );
};

const savedObjectMetaData = [
  {
    type: EVENT_ANNOTATION_GROUP_TYPE,
    getIconForSavedObject: () => 'annotation',
    name: i18n.translate('eventAnnotation.eventAnnotationGroup.metadata.name', {
      defaultMessage: 'Annotations Groups',
    }),
    includeFields: ['*'],
  },
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { CoreStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { SavedObjectsManagementPluginStart } from '@kbn/saved-objects-management-plugin/public';
import { EuiEmptyPrompt, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import { EVENT_ANNOTATION_GROUP_TYPE } from '../../common';

export const EventAnnotationGroupSavedObjectFinder = ({
  uiSettings,
  http,
  savedObjectsManagement,
  fixedPageSize = 10,
  checkHasAnnotationGroups,
  onChoose,
}: {
  uiSettings: IUiSettingsClient;
  http: CoreStart['http'];
  savedObjectsManagement: SavedObjectsManagementPluginStart;
  fixedPageSize?: number;
  checkHasAnnotationGroups: () => Promise<boolean>;
  onChoose: (value: {
    id: string;
    type: string;
    fullName: string;
    savedObject: SavedObjectCommon<unknown>;
  }) => void;
}) => {
  const [hasAnnotationGroups, setHasAnnotationGroups] = useState<boolean | undefined>();

  useEffect(() => {
    checkHasAnnotationGroups().then(setHasAnnotationGroups);
  }, [checkHasAnnotationGroups]);

  return hasAnnotationGroups === undefined ? (
    <EuiFlexGroup responsive={false} justifyContent="center">
      <EuiFlexItem grow={0}>
        <EuiLoadingSpinner />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : hasAnnotationGroups === false ? (
    <EuiEmptyPrompt
      title={
        <FormattedMessage
          id="eventAnnotation.eventAnnotationGroup.savedObjectFinder.emptyPrompt"
          defaultMessage="No library annotation groups found."
        />
      }
    />
  ) : (
    <SavedObjectFinder
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
      services={{
        uiSettings,
        http,
        savedObjectsManagement,
      }}
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

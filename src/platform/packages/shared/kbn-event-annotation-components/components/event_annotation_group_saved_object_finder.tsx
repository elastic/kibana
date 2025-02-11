/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import type { ContentClient } from '@kbn/content-management-plugin/public';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { EVENT_ANNOTATION_GROUP_TYPE } from '@kbn/event-annotation-common';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';

export const EventAnnotationGroupSavedObjectFinder = ({
  fixedPageSize = 10,
  checkHasAnnotationGroups,
  onChoose,
  onCreateNew,
  contentClient,
  uiSettings,
}: {
  contentClient: ContentClient;
  uiSettings: IUiSettingsClient;
  fixedPageSize?: number;
  checkHasAnnotationGroups: () => Promise<boolean>;
  onChoose: (value: {
    id: string;
    type: string;
    fullName: string;
    savedObject: SavedObjectCommon;
  }) => void;
  onCreateNew: () => void;
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
    <EuiFlexGroup
      css={css`
        height: 100%;
      `}
      direction="column"
      justifyContent="center"
    >
      <EuiFlexItem>
        <EuiEmptyPrompt
          titleSize="xs"
          title={
            <h2>
              <FormattedMessage
                id="eventAnnotationComponents.eventAnnotationGroup.savedObjectFinder.emptyPromptTitle"
                defaultMessage="Start by adding an annotation layer"
              />
            </h2>
          }
          body={
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="eventAnnotationComponents.eventAnnotationGroup.savedObjectFinder.emptyPromptDescription"
                  defaultMessage="There are currently no annotations available to select from the library. Create a new layer to add annotations."
                />
              </p>
            </EuiText>
          }
          actions={
            <EuiButton onClick={() => onCreateNew()} size="s">
              <FormattedMessage
                id="eventAnnotationComponents.eventAnnotationGroup.savedObjectFinder.emptyCTA"
                defaultMessage="Create annotation layer"
              />
            </EuiButton>
          }
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <SavedObjectFinder
      key="searchSavedObjectFinder"
      id="eventAnnotationGroup"
      fixedPageSize={fixedPageSize}
      onChoose={(id, type, fullName, savedObject) => {
        onChoose({ id, type, fullName, savedObject });
      }}
      showFilter={false}
      noItemsMessage={
        <FormattedMessage
          id="eventAnnotationComponents.eventAnnotationGroup.savedObjectFinder.notFoundLabel"
          defaultMessage="No matching annotation groups found."
        />
      }
      savedObjectMetaData={savedObjectMetaData}
      services={{
        contentClient,
        uiSettings,
      }}
    />
  );
};

const savedObjectMetaData = [
  {
    type: EVENT_ANNOTATION_GROUP_TYPE,
    getIconForSavedObject: () => 'annotation',
    name: i18n.translate('eventAnnotationComponents.eventAnnotationGroup.metadata.name', {
      defaultMessage: 'Annotations Groups',
    }),
    includeFields: ['*'],
  },
];

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { SavedObjectCommon } from '@kbn/saved-objects-finder-plugin/common';
import { SavedObjectFinder } from '@kbn/saved-objects-finder-plugin/public';
import { ContentClient } from '@kbn/content-management-plugin/public';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
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

export const EventAnnotationGroupSavedObjectFinder = ({
  contentClient,
  uiSettings,
  fixedPageSize = 10,
  checkHasAnnotationGroups,
  onChoose,
  onCreateNew,
}: {
  uiSettings: IUiSettingsClient;
  contentClient: ContentClient;
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
                id="eventAnnotation.eventAnnotationGroup.savedObjectFinder.emptyPromptTitle"
                defaultMessage="Start by adding an annotation layer"
              />
            </h2>
          }
          body={
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="eventAnnotation.eventAnnotationGroup.savedObjectFinder.emptyPromptDescription"
                  defaultMessage="There are currently no annotations available to select from the library. Create a new layer to add annotations."
                />
              </p>
            </EuiText>
          }
          actions={
            <EuiButton onClick={() => onCreateNew()} size="s">
              <FormattedMessage
                id="eventAnnotation.eventAnnotationGroup.savedObjectFinder.emptyCTA"
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
      services={{ contentClient, uiSettings }}
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

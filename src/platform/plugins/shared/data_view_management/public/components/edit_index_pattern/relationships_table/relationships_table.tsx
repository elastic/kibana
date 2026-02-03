/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { HorizontalAlignment, EuiTableDataType } from '@elastic/eui';
import {
  EuiInMemoryTable,
  EuiText,
  EuiLink,
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { get } from 'lodash';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { useEuiTablePersist } from '@kbn/shared-ux-table-persist';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';

import type {
  SavedObjectRelation,
  SavedObjectManagementTypeInfo,
  SavedObjectsManagementPluginStart,
} from '@kbn/saved-objects-management-plugin/public';

import type { SearchFilterConfig } from '@elastic/eui';
import { EuiIconTip } from '@elastic/eui';
import { IPM_APP_ID } from '../../../plugin';
import {
  typeFieldName,
  typeFieldDescription,
  titleFieldName,
  titleFieldDescription,
  filterTitle,
  managedBadge,
  relationshipsTableCaption,
} from './i18n';

const canGoInApp = (
  savedObject: SavedObjectRelation,
  capabilities: CoreStart['application']['capabilities']
) => {
  const { inAppUrl } = savedObject.meta;
  if (!inAppUrl) return false;
  if (!inAppUrl.uiCapabilitiesPath) return true;
  return Boolean(get(capabilities, inAppUrl.uiCapabilitiesPath));
};

export const RelationshipsTable = ({
  basePath,
  capabilities,
  id,
  navigateToUrl,
  getDefaultTitle,
  getSavedObjectLabel,
  relationships,
  allowedTypes,
  savedObjectsTagging,
}: {
  basePath: CoreStart['http']['basePath'];
  capabilities: CoreStart['application']['capabilities'];
  navigateToUrl: CoreStart['application']['navigateToUrl'];
  id: string;
  getDefaultTitle: SavedObjectsManagementPluginStart['getDefaultTitle'];
  getSavedObjectLabel: SavedObjectsManagementPluginStart['getSavedObjectLabel'];
  relationships: SavedObjectRelation[];
  allowedTypes: SavedObjectManagementTypeInfo[];
  savedObjectsTagging?: SavedObjectsTaggingApi;
}) => {
  const columns = [
    {
      field: 'type',
      name: typeFieldName,
      width: '50px',
      align: 'center' as HorizontalAlignment,
      description: typeFieldDescription,
      sortable: false,
      render: (type: string, object: SavedObjectRelation) => {
        const typeLabel = getSavedObjectLabel(type, allowedTypes);
        return (
          <EuiIconTip
            content={typeLabel}
            position="top"
            aria-label={typeLabel}
            type={object.meta.icon || 'apps'}
            size="s"
            iconProps={{
              'data-test-subj': 'relationshipsObjectType',
            }}
          />
        );
      },
    },
    {
      field: 'title',
      name: titleFieldName,
      description: titleFieldDescription,
      dataType: 'string' as EuiTableDataType,
      sortable: false,
      render: (title: string, object: SavedObjectRelation) => {
        const path = object.meta.inAppUrl?.path || '';
        const showUrl = canGoInApp(object, capabilities);
        const titleDisplayed = title || getDefaultTitle(object);

        const TagListComponent = savedObjectsTagging?.ui.components.TagList;

        const isManaged = object.managed === true;
        const hasTags = object.references?.some((ref) => ref.type === 'tag') === true;

        const showTags = !!TagListComponent && hasTags;
        const showBadges = isManaged || showTags;

        return (
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            {showUrl ? (
              <EuiLink href={basePath.prepend(path)} data-test-subj="relationshipsTitle">
                {titleDisplayed}
              </EuiLink>
            ) : (
              <EuiText size="s" data-test-subj="relationshipsTitle">
                {titleDisplayed}
              </EuiText>
            )}
            {showBadges && (
              <EuiBadgeGroup>
                {isManaged && (
                  <EuiBadge color="hollow" data-test-subj="managedBadge">
                    {managedBadge}
                  </EuiBadge>
                )}
                {showTags && (
                  <TagListComponent object={object} data-test-subj="relationshipsTags" />
                )}
              </EuiBadgeGroup>
            )}
          </EuiFlexGroup>
        );
      },
    },
  ];

  const filterTypesMap = new Map(
    relationships.map((relationship) => [
      relationship.type,
      {
        value: relationship.type,
        name: relationship.type,
        view: relationship.type,
      },
    ])
  );

  const search = {
    // query,
    // onChange: handleOnChange,
    box: {
      incremental: true,
      schema: true,
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'type',
        name: filterTitle,
        multiSelect: 'or',
        options: [...filterTypesMap.values()],
      },
    ] as SearchFilterConfig[],
  };

  const { pageSize, onTableChange } = useEuiTablePersist<SavedObjectRelation>({
    tableId: 'dataViewMgmtRelationships',
    initialPageSize: 10,
  });

  return (
    <RedirectAppLinks currentAppId={IPM_APP_ID} navigateToUrl={navigateToUrl}>
      <EuiInMemoryTable<SavedObjectRelation>
        items={relationships}
        columns={columns}
        tableCaption={relationshipsTableCaption}
        pagination={{
          pageSize,
        }}
        onTableChange={onTableChange}
        search={search}
        rowProps={() => ({
          'data-test-subj': `relationshipsTableRow`,
        })}
      />
    </RedirectAppLinks>
  );
};

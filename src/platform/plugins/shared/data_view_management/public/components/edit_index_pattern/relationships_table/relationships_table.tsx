/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiInMemoryTable,
  HorizontalAlignment,
  EuiText,
  EuiLink,
  EuiTableDataType,
} from '@elastic/eui';
import { CoreStart } from '@kbn/core/public';
import { get } from 'lodash';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { useEuiTablePersist } from '@kbn/shared-ux-table-persist';

import {
  SavedObjectRelation,
  SavedObjectManagementTypeInfo,
  SavedObjectsManagementPluginStart,
} from '@kbn/saved-objects-management-plugin/public';

import { EuiToolTip, EuiIcon, SearchFilterConfig } from '@elastic/eui';
import { IPM_APP_ID } from '../../../plugin';
import {
  typeFieldName,
  typeFieldDescription,
  titleFieldName,
  titleFieldDescription,
  filterTitle,
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
}: {
  basePath: CoreStart['http']['basePath'];
  capabilities: CoreStart['application']['capabilities'];
  navigateToUrl: CoreStart['application']['navigateToUrl'];
  id: string;
  getDefaultTitle: SavedObjectsManagementPluginStart['getDefaultTitle'];
  getSavedObjectLabel: SavedObjectsManagementPluginStart['getSavedObjectLabel'];
  relationships: SavedObjectRelation[];
  allowedTypes: SavedObjectManagementTypeInfo[];
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
          <EuiToolTip position="top" content={typeLabel}>
            <EuiIcon
              aria-label={typeLabel}
              type={object.meta.icon || 'apps'}
              size="s"
              data-test-subj="relationshipsObjectType"
            />
          </EuiToolTip>
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

        return showUrl ? (
          <EuiLink href={basePath.prepend(path)} data-test-subj="relationshipsTitle">
            {titleDisplayed}
          </EuiLink>
        ) : (
          <EuiText size="s" data-test-subj="relationshipsTitle">
            {titleDisplayed}
          </EuiText>
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

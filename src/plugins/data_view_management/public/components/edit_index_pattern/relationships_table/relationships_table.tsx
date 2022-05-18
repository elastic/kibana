/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiInMemoryTable,
  HorizontalAlignment,
  EuiText,
  EuiLink,
  EuiTableDataType,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { CoreStart } from '@kbn/core/public';
import { get } from 'lodash';

import {
  SavedObjectRelation,
  getSavedObjectLabel,
  SavedObjectManagementTypeInfo,
  getRelationships,
  getAllowedTypes,
  getDefaultTitle,
  SavedObjectWithMetadata,
} from '@kbn/saved-objects-management-plugin/public';

import { EuiToolTip, EuiIcon, SearchFilterConfig } from '@elastic/eui';

const canGoInApp = (
  savedObject: SavedObjectWithMetadata,
  capabilities: CoreStart['application']['capabilities']
) => {
  const { inAppUrl } = savedObject.meta;
  if (!inAppUrl) return false;
  if (!inAppUrl.uiCapabilitiesPath) return true;
  return Boolean(get(capabilities, inAppUrl.uiCapabilitiesPath));
};

export const RelationshipsTable = ({
  http,
  capabilities,
  id,
}: {
  http: CoreStart['http'];
  capabilities: CoreStart['application']['capabilities'];
  id: string;
}) => {
  const [relationships, setRelationships] = useState<SavedObjectRelation[]>([]);
  const [allowedTypes, setAllowedTypes] = useState<SavedObjectManagementTypeInfo[]>([]);

  useEffect(() => {
    getAllowedTypes(http).then((resp) => {
      setAllowedTypes(resp);
    });
  }, [http]);

  useEffect(() => {
    if (allowedTypes.length === 0) {
      return;
    }
    const allowedAsString = allowedTypes.map((item) => item.name);
    getRelationships(http, 'index-pattern', id, allowedAsString).then((resp) => {
      setRelationships(resp.relations);
    });
  }, [http, id, allowedTypes]);

  const columns = [
    {
      field: 'type',
      name: i18n.translate('savedObjectsManagement.objectsTable.relationships.columnTypeName', {
        defaultMessage: 'Type',
      }),
      width: '50px',
      align: 'center' as HorizontalAlignment,
      description: i18n.translate(
        'savedObjectsManagement.objectsTable.relationships.columnTypeDescription',
        { defaultMessage: 'Type of the saved object' }
      ),
      sortable: false,
      render: (type: string, object: any /* SavedObjectWithMetadata */) => {
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
      field: 'meta.title',
      name: i18n.translate('savedObjectsManagement.objectsTable.relationships.columnTitleName', {
        defaultMessage: 'Title',
      }),
      description: i18n.translate(
        'savedObjectsManagement.objectsTable.relationships.columnTitleDescription',
        { defaultMessage: 'Title of the saved object' }
      ),
      dataType: 'string' as EuiTableDataType,
      sortable: false,
      render: (title: string, object: SavedObjectWithMetadata) => {
        const { path = '' } = object.meta.inAppUrl || {};
        const showUrl = canGoInApp(object, capabilities);
        if (!showUrl) {
          return (
            <EuiText size="s" data-test-subj="relationshipsTitle">
              {title || getDefaultTitle(object)}
            </EuiText>
          );
        }
        return (
          <EuiLink href={http.basePath.prepend(path)} data-test-subj="relationshipsTitle">
            {title || getDefaultTitle(object)}
          </EuiLink>
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
    filters: [
      {
        type: 'field_value_selection',
        field: 'type',
        name: i18n.translate(
          'savedObjectsManagement.objectsTable.relationships.search.filters.type.name',
          { defaultMessage: 'Type' }
        ),
        multiSelect: 'or',
        options: [...filterTypesMap.values()],
      },
    ] as SearchFilterConfig[],
  };

  return (
    <EuiInMemoryTable<SavedObjectRelation>
      items={relationships}
      columns={columns}
      pagination={true}
      search={search}
      rowProps={() => ({
        'data-test-subj': `relationshipsTableRow`,
      })}
    />
  );
};

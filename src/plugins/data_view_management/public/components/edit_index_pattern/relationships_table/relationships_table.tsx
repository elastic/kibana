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
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/public';
import { get } from 'lodash';
// import { RedirectAppLinksProvider } from '@kbn/shared-ux-link-redirect_app';

import {
  SavedObjectRelation,
  getSavedObjectLabel,
  SavedObjectManagementTypeInfo,
  getDefaultTitle,
  SavedObjectsManagementPluginStart,
} from '@kbn/saved-objects-management-plugin/public';

import { EuiToolTip, EuiIcon, SearchFilterConfig } from '@elastic/eui';
// import { IPM_APP_ID } from '../../../plugin';

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
  http,
  capabilities,
  id,
  getAllowedTypes,
  getRelationships,
  navigateToUrl,
}: {
  http: CoreStart['http'];
  capabilities: CoreStart['application']['capabilities'];
  navigateToUrl: CoreStart['application']['navigateToUrl'];
  id: string;
  getAllowedTypes: SavedObjectsManagementPluginStart['getAllowedTypes'];
  getRelationships: SavedObjectsManagementPluginStart['getRelationships'];
}) => {
  const [relationships, setRelationships] = useState<SavedObjectRelation[]>([]);
  const [allowedTypes, setAllowedTypes] = useState<SavedObjectManagementTypeInfo[]>([]);
  const [query, setQuery] = useState('');

  const handleOnChange = ({ queryText, error }: { queryText: string; error: unknown }) => {
    if (!error) {
      setQuery(queryText);
    }
  };

  useEffect(() => {
    getAllowedTypes().then((resp) => {
      setAllowedTypes(resp);
    });
  }, [getAllowedTypes]);

  useEffect(() => {
    if (allowedTypes.length === 0) {
      return;
    }
    const allowedAsString = allowedTypes.map((item) => item.name);
    getRelationships(DATA_VIEW_SAVED_OBJECT_TYPE, id, allowedAsString).then((resp) => {
      setRelationships(resp.relations);
    });
  }, [getRelationships, id, allowedTypes]);

  const columns = [
    {
      field: 'type',
      name: i18n.translate('indexPatternManagement.objectsTable.relationships.columnTypeName', {
        defaultMessage: 'Type',
      }),
      width: '50px',
      align: 'center' as HorizontalAlignment,
      description: i18n.translate(
        'indexPatternManagement.objectsTable.relationships.columnTypeDescription',
        { defaultMessage: 'Type of the saved object' }
      ),
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
      field: 'meta.title',
      name: i18n.translate('indexPatternManagement.objectsTable.relationships.columnTitleName', {
        defaultMessage: 'Title',
      }),
      description: i18n.translate(
        'indexPatternManagement.objectsTable.relationships.columnTitleDescription',
        { defaultMessage: 'Title of the saved object' }
      ),
      dataType: 'string' as EuiTableDataType,
      sortable: false,
      render: (title: string, object: SavedObjectRelation) => {
        const { path = '' } = object.meta.inAppUrl || {};
        const showUrl = canGoInApp(object, capabilities);
        if (!showUrl) {
          return (
            <EuiText size="s" data-test-subj="relationshipsTitle">
              {title || getDefaultTitle(object)}
            </EuiText>
          );
        }
        // todo navigate to the app
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
    query,
    onChange: handleOnChange,
    box: {
      incremental: true,
      schema: {
        fields: { 'meta.title': { type: 'string' } },
      },
    },
    filters: [
      {
        type: 'field_value_selection',
        field: 'type',
        name: i18n.translate(
          'indexPatternManagement.objectsTable.relationships.search.filters.type.name',
          { defaultMessage: 'Type' }
        ),
        multiSelect: 'or',
        options: [...filterTypesMap.values()],
      },
    ] as SearchFilterConfig[],
  };

  return (
    /* <RedirectAppLinksProvider currentAppId={IPM_APP_ID} navigateToUrl={navigateToUrl}> */
    <EuiInMemoryTable<SavedObjectRelation>
      items={relationships}
      columns={columns}
      pagination={true}
      search={search}
      rowProps={() => ({
        'data-test-subj': `relationshipsTableRow`,
      })}
    />
    /* </RedirectAppLinksProvider> */
  );
};

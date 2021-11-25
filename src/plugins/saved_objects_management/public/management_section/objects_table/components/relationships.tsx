/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import {
  EuiTitle,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiIcon,
  EuiCallOut,
  EuiLoadingElastic,
  EuiInMemoryTable,
  EuiToolTip,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import { SearchFilterConfig } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { IBasePath } from 'src/core/public';
import type { SavedObjectManagementTypeInfo } from '../../../../common/types';
import { getDefaultTitle, getSavedObjectLabel } from '../../../lib';
import {
  SavedObjectWithMetadata,
  SavedObjectRelationKind,
  SavedObjectRelation,
  SavedObjectInvalidRelation,
  SavedObjectGetRelationshipsResponse,
} from '../../../types';

export interface RelationshipsProps {
  basePath: IBasePath;
  getRelationships: (type: string, id: string) => Promise<SavedObjectGetRelationshipsResponse>;
  savedObject: SavedObjectWithMetadata;
  close: () => void;
  goInspectObject: (obj: SavedObjectWithMetadata) => void;
  canGoInApp: (obj: SavedObjectWithMetadata) => boolean;
  allowedTypes: SavedObjectManagementTypeInfo[];
}

export interface RelationshipsState {
  relations: SavedObjectRelation[];
  invalidRelations: SavedObjectInvalidRelation[];
  isLoading: boolean;
  error?: string;
}

const relationshipColumn = {
  field: 'relationship',
  name: i18n.translate('savedObjectsManagement.objectsTable.relationships.columnRelationshipName', {
    defaultMessage: 'Direct relationship',
  }),
  dataType: 'string',
  sortable: false,
  width: '125px',
  'data-test-subj': 'directRelationship',
  render: (relationship: SavedObjectRelationKind) => {
    return (
      <EuiText size="s">
        {relationship === 'parent' ? (
          <FormattedMessage
            id="savedObjectsManagement.objectsTable.relationships.columnRelationship.parentAsValue"
            defaultMessage="Parent"
          />
        ) : (
          <FormattedMessage
            id="savedObjectsManagement.objectsTable.relationships.columnRelationship.childAsValue"
            defaultMessage="Child"
          />
        )}
      </EuiText>
    );
  },
};

export class Relationships extends Component<RelationshipsProps, RelationshipsState> {
  constructor(props: RelationshipsProps) {
    super(props);

    this.state = {
      relations: [],
      invalidRelations: [],
      isLoading: false,
      error: undefined,
    };
  }

  UNSAFE_componentWillMount() {
    this.getRelationshipData();
  }

  UNSAFE_componentWillReceiveProps(nextProps: RelationshipsProps) {
    if (nextProps.savedObject.id !== this.props.savedObject.id) {
      this.getRelationshipData();
    }
  }

  async getRelationshipData() {
    const { savedObject, getRelationships } = this.props;

    this.setState({ isLoading: true });

    try {
      const { relations, invalidRelations } = await getRelationships(
        savedObject.type,
        savedObject.id
      );
      this.setState({ relations, invalidRelations, isLoading: false, error: undefined });
    } catch (err) {
      this.setState({ error: err.message, isLoading: false });
    }
  }

  renderError() {
    const { error } = this.state;

    if (!error) {
      return null;
    }

    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="savedObjectsManagement.objectsTable.relationships.renderErrorMessage"
            defaultMessage="Error"
          />
        }
        color="danger"
      >
        {error}
      </EuiCallOut>
    );
  }

  renderInvalidRelationship() {
    const { invalidRelations } = this.state;
    if (!invalidRelations.length) {
      return null;
    }

    const columns = [
      {
        field: 'type',
        name: i18n.translate('savedObjectsManagement.objectsTable.relationships.columnTypeName', {
          defaultMessage: 'Type',
        }),
        width: '150px',
        description: i18n.translate(
          'savedObjectsManagement.objectsTable.relationships.columnTypeDescription',
          { defaultMessage: 'Type of the saved object' }
        ),
        sortable: false,
        'data-test-subj': 'relationshipsObjectType',
      },
      {
        field: 'id',
        name: i18n.translate('savedObjectsManagement.objectsTable.relationships.columnIdName', {
          defaultMessage: 'Id',
        }),
        width: '150px',
        description: i18n.translate(
          'savedObjectsManagement.objectsTable.relationships.columnIdDescription',
          { defaultMessage: 'Id of the saved object' }
        ),
        sortable: false,
        'data-test-subj': 'relationshipsObjectId',
      },
      relationshipColumn,
      {
        field: 'error',
        name: i18n.translate('savedObjectsManagement.objectsTable.relationships.columnErrorName', {
          defaultMessage: 'Error',
        }),
        description: i18n.translate(
          'savedObjectsManagement.objectsTable.relationships.columnErrorDescription',
          { defaultMessage: 'Error encountered with the relation' }
        ),
        sortable: false,
        'data-test-subj': 'relationshipsError',
      },
    ];

    return (
      <>
        <EuiCallOut
          color="warning"
          iconType="alert"
          title={i18n.translate(
            'savedObjectsManagement.objectsTable.relationships.invalidRelationShip',
            {
              defaultMessage: 'This saved object has some invalid relations.',
            }
          )}
        />
        <EuiSpacer />
        <EuiInMemoryTable
          items={invalidRelations}
          columns={columns as any}
          pagination={true}
          rowProps={() => ({
            'data-test-subj': `invalidRelationshipsTableRow`,
          })}
        />
        <EuiSpacer />
      </>
    );
  }

  renderRelationshipsTable() {
    const { goInspectObject, basePath, savedObject, allowedTypes } = this.props;
    const { relations, isLoading, error } = this.state;

    if (error) {
      return this.renderError();
    }

    if (isLoading) {
      return <EuiLoadingElastic size="xl" />;
    }

    const columns = [
      {
        field: 'type',
        name: i18n.translate('savedObjectsManagement.objectsTable.relationships.columnTypeName', {
          defaultMessage: 'Type',
        }),
        width: '50px',
        align: 'center',
        description: i18n.translate(
          'savedObjectsManagement.objectsTable.relationships.columnTypeDescription',
          { defaultMessage: 'Type of the saved object' }
        ),
        sortable: false,
        render: (type: string, object: SavedObjectWithMetadata) => {
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
      relationshipColumn,
      {
        field: 'meta.title',
        name: i18n.translate('savedObjectsManagement.objectsTable.relationships.columnTitleName', {
          defaultMessage: 'Title',
        }),
        description: i18n.translate(
          'savedObjectsManagement.objectsTable.relationships.columnTitleDescription',
          { defaultMessage: 'Title of the saved object' }
        ),
        dataType: 'string',
        sortable: false,
        render: (title: string, object: SavedObjectWithMetadata) => {
          const { path = '' } = object.meta.inAppUrl || {};
          const canGoInApp = this.props.canGoInApp(object);
          if (!canGoInApp) {
            return (
              <EuiText size="s" data-test-subj="relationshipsTitle">
                {title || getDefaultTitle(object)}
              </EuiText>
            );
          }
          return (
            <EuiLink href={basePath.prepend(path)} data-test-subj="relationshipsTitle">
              {title || getDefaultTitle(object)}
            </EuiLink>
          );
        },
      },
      {
        name: i18n.translate(
          'savedObjectsManagement.objectsTable.relationships.columnActionsName',
          { defaultMessage: 'Actions' }
        ),
        actions: [
          {
            name: i18n.translate(
              'savedObjectsManagement.objectsTable.relationships.columnActions.inspectActionName',
              { defaultMessage: 'Inspect' }
            ),
            description: i18n.translate(
              'savedObjectsManagement.objectsTable.relationships.columnActions.inspectActionDescription',
              { defaultMessage: 'Inspect this saved object' }
            ),
            type: 'icon',
            icon: 'inspect',
            'data-test-subj': 'relationshipsTableAction-inspect',
            onClick: (object: SavedObjectWithMetadata) => goInspectObject(object),
            available: (object: SavedObjectWithMetadata) => !!(object.type && object.id),
          },
        ],
      },
    ];

    const filterTypesMap = new Map(
      relations.map((relationship) => [
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
          field: 'relationship',
          name: i18n.translate(
            'savedObjectsManagement.objectsTable.relationships.search.filters.relationship.name',
            { defaultMessage: 'Direct relationship' }
          ),
          multiSelect: 'or',
          options: [
            {
              value: 'parent',
              name: 'parent',
              view: i18n.translate(
                'savedObjectsManagement.objectsTable.relationships.search.filters.relationship.parentAsValue.view',
                { defaultMessage: 'Parent' }
              ),
            },
            {
              value: 'child',
              name: 'child',
              view: i18n.translate(
                'savedObjectsManagement.objectsTable.relationships.search.filters.relationship.childAsValue.view',
                { defaultMessage: 'Child' }
              ),
            },
          ],
        },
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
      <>
        <EuiCallOut>
          <p>
            {i18n.translate(
              'savedObjectsManagement.objectsTable.relationships.relationshipsTitle',
              {
                defaultMessage:
                  'Here are the saved objects related to {title}. ' +
                  'Deleting this {type} affects its parent objects, but not its children.',
                values: {
                  type: savedObject.type,
                  title: savedObject.meta.title || getDefaultTitle(savedObject),
                },
              }
            )}
          </p>
        </EuiCallOut>
        <EuiSpacer />
        <EuiInMemoryTable
          items={relations}
          columns={columns as any}
          pagination={true}
          search={search}
          rowProps={() => ({
            'data-test-subj': `relationshipsTableRow`,
          })}
        />
      </>
    );
  }

  render() {
    const { close, savedObject, allowedTypes } = this.props;
    const typeLabel = getSavedObjectLabel(savedObject.type, allowedTypes);

    return (
      <EuiFlyout onClose={close}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <EuiToolTip position="top" content={typeLabel}>
                <EuiIcon aria-label={typeLabel} size="m" type={savedObject.meta.icon || 'apps'} />
              </EuiToolTip>
              &nbsp;&nbsp;
              {savedObject.meta.title || getDefaultTitle(savedObject)}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {this.renderInvalidRelationship()}
          {this.renderRelationshipsTable()}
        </EuiFlyoutBody>
      </EuiFlyout>
    );
  }
}

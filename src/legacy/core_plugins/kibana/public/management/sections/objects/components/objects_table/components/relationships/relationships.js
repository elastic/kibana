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

import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiTitle,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiLink,
  EuiIcon,
  EuiCallOut,
  EuiLoadingKibana,
  EuiInMemoryTable,
  EuiToolTip,
  EuiText,
  EuiSpacer,
} from '@elastic/eui';
import chrome from 'ui/chrome';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { getDefaultTitle, getSavedObjectLabel } from '../../../../lib';

class RelationshipsUI extends Component {
  static propTypes = {
    getRelationships: PropTypes.func.isRequired,
    savedObject: PropTypes.object.isRequired,
    close: PropTypes.func.isRequired,
    goInspectObject: PropTypes.func.isRequired,
    canGoInApp: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      relationships: undefined,
      isLoading: false,
      error: undefined,
    };
  }

  componentWillMount() {
    this.getRelationshipData();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.savedObject.id !== this.props.savedObject.id) {
      this.getRelationshipData();
    }
  }

  async getRelationshipData() {
    const { savedObject, getRelationships } = this.props;

    this.setState({ isLoading: true });

    try {
      const relationships = await getRelationships(savedObject.type, savedObject.id);
      this.setState({ relationships, isLoading: false, error: undefined });
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
        title={(
          <FormattedMessage id="kbn.management.objects.objectsTable.relationships.renderErrorMessage" defaultMessage="Error"/>
        )}
        color="danger"
      >
        {error}
      </EuiCallOut>
    );
  }

  renderRelationships() {
    const { intl, goInspectObject, savedObject } = this.props;
    const { relationships, isLoading, error } = this.state;

    if (error) {
      return this.renderError();
    }

    if (isLoading) {
      return <EuiLoadingKibana size="xl" />;
    }

    const columns = [
      {
        field: 'type',
        name: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.relationships.columnTypeName',
          defaultMessage: 'Type',
        }),
        width: '50px',
        align: 'center',
        description:
          intl.formatMessage({
            id: 'kbn.management.objects.objectsTable.relationships.columnTypeDescription',
            defaultMessage: 'Type of the saved object',
          }),
        sortable: false,
        render: (type, object) => {
          return (
            <EuiToolTip
              position="top"
              content={getSavedObjectLabel(type)}
            >
              <EuiIcon
                aria-label={getSavedObjectLabel(type)}
                type={object.meta.icon || 'apps'}
                size="s"
              />
            </EuiToolTip>
          );
        },
      },
      {
        field: 'relationship',
        name: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.relationships.columnRelationshipName',
          defaultMessage: 'Direct relationship',
        }),
        dataType: 'string',
        sortable: false,
        width: '125px',
        render: relationship => {
          if (relationship === 'parent') {
            return (
              <EuiText size="s">
                <FormattedMessage
                  id="kbn.management.objects.objectsTable.relationships.columnRelationship.parentAsValue"
                  defaultMessage="Parent"
                />
              </EuiText>
            );
          }
          if (relationship === 'child') {
            return (
              <EuiText size="s">
                <FormattedMessage
                  id="kbn.management.objects.objectsTable.relationships.columnRelationship.childAsValue"
                  defaultMessage="Child"
                />
              </EuiText>
            );
          }
        },
      },
      {
        field: 'meta.title',
        name: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.relationships.columnTitleName',
          defaultMessage: 'Title',
        }),
        description:
        intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.relationships.columnTitleDescription',
          defaultMessage: 'Title of the saved object',
        }),
        dataType: 'string',
        sortable: false,
        render: (title, object) => {
          const { path } = object.meta.inAppUrl || {};
          const canGoInApp = this.props.canGoInApp(object);
          if (!canGoInApp) {
            return (
              <EuiText size="s">{title || getDefaultTitle(object)}</EuiText>
            );
          }
          return (
            <EuiLink href={chrome.addBasePath(path)}>{title || getDefaultTitle(object)}</EuiLink>
          );
        },
      },
      {
        name: intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.relationships.columnActionsName',
          defaultMessage: 'Actions',
        }),
        actions: [
          {
            name: intl.formatMessage({
              id: 'kbn.management.objects.objectsTable.relationships.columnActions.inspectActionName',
              defaultMessage: 'Inspect',
            }),
            description:
              intl.formatMessage({
                id: 'kbn.management.objects.objectsTable.relationships.columnActions.inspectActionDescription',
                defaultMessage: 'Inspect this saved object',
              }),
            type: 'icon',
            icon: 'inspect',
            onClick: object => goInspectObject(object),
            available: object => !!object.meta.editUrl,
          },
        ],
      },
    ];

    const filterTypesMap = new Map(
      relationships.map(relationship => [
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
          name: intl.formatMessage({
            id: 'kbn.management.objects.objectsTable.relationships.search.filters.relationship.name',
            defaultMessage: 'Direct relationship',
          }),
          multiSelect: 'or',
          options: [
            {
              value: 'parent',
              name: 'parent',
              view: intl.formatMessage({
                id: 'kbn.management.objects.objectsTable.relationships.search.filters.relationship.parentAsValue.view',
                defaultMessage: 'Parent',
              }),
            },
            {
              value: 'child',
              name: 'child',
              view: intl.formatMessage({
                id: 'kbn.management.objects.objectsTable.relationships.search.filters.relationship.childAsValue.view',
                defaultMessage: 'Child',
              }),
            },
          ],
        },
        {
          type: 'field_value_selection',
          field: 'type',
          name: intl.formatMessage({
            id: 'kbn.management.objects.objectsTable.relationships.search.filters.type.name',
            defaultMessage: 'Type',
          }),
          multiSelect: 'or',
          options: [...filterTypesMap.values()],
        },
      ],
    };

    return (
      <div>
        <EuiCallOut>
          <p>
            {intl.formatMessage({
              id: 'kbn.management.objects.objectsTable.relationships.relationshipsTitle',
              defaultMessage: 'Here are the saved objects related to {title}. ' +
                'Deleting this {type} affects its parent objects, but not its children.',
            }, {
              type: savedObject.type,
              title: savedObject.meta.title || getDefaultTitle(savedObject)
            })}
          </p>
        </EuiCallOut>
        <EuiSpacer />
        <EuiInMemoryTable
          items={relationships}
          columns={columns}
          pagination={true}
          search={search}
        />
      </div>
    );
  }

  render() {
    const { close, savedObject } = this.props;

    return (
      <EuiFlyout onClose={close}>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <EuiToolTip position="top" content={getSavedObjectLabel(savedObject.type)}>
                <EuiIcon
                  aria-label={getSavedObjectLabel(savedObject.type)}
                  size="m"
                  type={savedObject.meta.icon || 'apps'}
                />
              </EuiToolTip>
              &nbsp;&nbsp;
              {savedObject.meta.title || getDefaultTitle(savedObject)}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>{this.renderRelationships()}</EuiFlyoutBody>
      </EuiFlyout>
    );
  }
}

export const Relationships = injectI18n(RelationshipsUI);

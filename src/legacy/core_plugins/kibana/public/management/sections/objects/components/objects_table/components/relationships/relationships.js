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
  EuiSpacer
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { getSavedObjectIcon, getSavedObjectLabel } from '../../../../lib';

class RelationshipsUI extends Component {
  static propTypes = {
    getRelationships: PropTypes.func.isRequired,
    id: PropTypes.string.isRequired,
    type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    close: PropTypes.func.isRequired,
    getEditUrl: PropTypes.func.isRequired,
    goInApp: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      referencedToObjects: undefined,
      referencedByObjects: undefined,
      isLoading: false,
      error: undefined,
    };
  }

  componentWillMount() {
    this.getRelationshipData();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.id !== this.props.id) {
      this.getRelationshipData();
    }
  }

  async getRelationshipData() {
    const { id, type, getRelationships } = this.props;

    this.setState({ isLoading: true });

    try {
      const { referencedToObjects, referencedByObjects } = await getRelationships(type, id);
      this.setState({ referencedToObjects, referencedByObjects, isLoading: false, error: undefined });
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
    const { getEditUrl, goInApp, intl } = this.props;
    const { referencedToObjects, referencedByObjects, isLoading, error } = this.state;

    if (error) {
      return this.renderError();
    }

    if (isLoading) {
      return <EuiLoadingKibana size="xl" />;
    }

    const columns = [
      {
        field: 'type',
        name: intl.formatMessage({ id: 'kbn.management.objects.objectsTable.relationships.columnTypeName', defaultMessage: 'Type' }),
        width: '50px',
        align: 'center',
        description:
          intl.formatMessage({
            id: 'kbn.management.objects.objectsTable.relationships.columnTypeDescription', defaultMessage: 'Type of the saved object'
          }),
        sortable: false,
        render: type => {
          return (
            <EuiToolTip
              position="top"
              content={getSavedObjectLabel(type)}
            >
              <EuiIcon
                aria-label={getSavedObjectLabel(type)}
                type={getSavedObjectIcon(type)}
                size="s"
              />
            </EuiToolTip>
          );
        },
      },
      {
        field: 'title',
        name: intl.formatMessage({ id: 'kbn.management.objects.objectsTable.relationships.columnTitleName', defaultMessage: 'Title' }),
        description:
        intl.formatMessage({
          id: 'kbn.management.objects.objectsTable.relationships.columnTitleDescription', defaultMessage: 'Title of the saved object'
        }),
        dataType: 'string',
        sortable: false,
        render: (title, object) => (
          <EuiLink href={getEditUrl(object.id, object.type)}>{title}</EuiLink>
        ),
      },
      {
        name: intl.formatMessage({ id: 'kbn.management.objects.objectsTable.relationships.columnActionsName', defaultMessage: 'Actions' }),
        actions: [
          {
            name: intl.formatMessage({
              id: 'kbn.management.objects.objectsTable.relationships.columnActions.viewInAppActionName', defaultMessage: 'In app'
            }),
            description:
              intl.formatMessage({
                id: 'kbn.management.objects.objectsTable.relationships.columnActions.viewInAppActionDescription',
                defaultMessage: 'View this saved object within Kibana'
              }),
            type: 'icon',
            icon: 'eye',
            onClick: object => goInApp(object.id, object.type),
          },
        ],
      },
    ];

    return (
      <div>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="kbn.management.objects.objectsTable.relationships.referencedToObjectsTitle"
              defaultMessage="Dependencies"
            />
          </h3>
        </EuiTitle>
        <EuiInMemoryTable
          items={referencedToObjects}
          columns={columns}
          pagination={true}
        />
        <EuiSpacer size="m" />
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="kbn.management.objects.objectsTable.relationships.referencedByObjectsTitle"
              defaultMessage="Related objects"
            />
          </h3>
        </EuiTitle>
        <EuiInMemoryTable
          items={referencedByObjects}
          columns={columns}
          pagination={true}
        />
      </div>
    );
  }

  render() {
    const { close, title, type } = this.props;

    return (
      <EuiFlyout onClose={close}>
        <EuiFlyoutHeader>
          <EuiTitle>
            <h2>
              <EuiToolTip position="top" content={getSavedObjectLabel(type)}>
                <EuiIcon
                  aria-label={getSavedObjectLabel(type)}
                  size="m"
                  type={getSavedObjectIcon(type)}
                />
              </EuiToolTip>
              &nbsp;&nbsp;
              {title}
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>

        <EuiFlyoutBody>{this.renderRelationships()}</EuiFlyoutBody>
      </EuiFlyout>
    );
  }
}

export const Relationships = injectI18n(RelationshipsUI);

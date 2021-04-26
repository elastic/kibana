/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiPageContent } from '@elastic/eui';
import {
  Capabilities,
  SavedObjectsClientContract,
  OverlayStart,
  NotificationsStart,
  ScopedHistory,
  HttpSetup,
} from '../../../../../core/public';
import { ISavedObjectsManagementServiceRegistry } from '../../services';
import { Header, NotFoundErrors, Intro, Form } from './components';
import { canViewInApp, findObject } from '../../lib';
import { SubmittedFormData } from '../types';
import { SavedObjectWithMetadata } from '../../types';

interface SavedObjectEditionProps {
  id: string;
  http: HttpSetup;
  serviceName: string;
  serviceRegistry: ISavedObjectsManagementServiceRegistry;
  capabilities: Capabilities;
  overlays: OverlayStart;
  notifications: NotificationsStart;
  notFoundType?: string;
  savedObjectsClient: SavedObjectsClientContract;
  history: ScopedHistory;
}

interface SavedObjectEditionState {
  type: string;
  object?: SavedObjectWithMetadata<any>;
}

export class SavedObjectEdition extends Component<
  SavedObjectEditionProps,
  SavedObjectEditionState
> {
  constructor(props: SavedObjectEditionProps) {
    super(props);

    const { serviceRegistry, serviceName } = props;
    const type = serviceRegistry.get(serviceName)!.service.type;

    this.state = {
      object: undefined,
      type,
    };
  }

  componentDidMount() {
    const { http, id } = this.props;
    const { type } = this.state;
    findObject(http, type, id).then((object) => {
      this.setState({
        object,
      });
    });
  }

  render() {
    const {
      capabilities,
      notFoundType,
      serviceRegistry,
      http,
      serviceName,
      savedObjectsClient,
    } = this.props;
    const { type } = this.state;
    const { object } = this.state;
    const { edit: canEdit, delete: canDelete } = capabilities.savedObjectsManagement as Record<
      string,
      boolean
    >;
    const canView = canViewInApp(capabilities, type) && Boolean(object?.meta.inAppUrl?.path);
    const service = serviceRegistry.get(serviceName)!.service;

    return (
      <EuiPageContent horizontalPosition="center" data-test-subj="savedObjectsEdit">
        <Header
          canEdit={canEdit}
          canDelete={canDelete && !object?.meta.hiddenType}
          canViewInApp={canView}
          type={type}
          onDeleteClick={() => this.delete()}
          viewUrl={http.basePath.prepend(object?.meta.inAppUrl?.path || '')}
        />
        {notFoundType && (
          <>
            <EuiSpacer size="s" />
            <NotFoundErrors type={notFoundType} />
          </>
        )}
        {canEdit && (
          <>
            <EuiSpacer size="s" />
            <Intro />
          </>
        )}
        {object && (
          <>
            <EuiSpacer size="m" />
            <Form
              object={object}
              savedObjectsClient={savedObjectsClient}
              service={service}
              editionEnabled={canEdit}
              onSave={this.saveChanges}
            />
          </>
        )}
      </EuiPageContent>
    );
  }

  async delete() {
    const { id, savedObjectsClient, overlays, notifications } = this.props;
    const { type, object } = this.state;

    const confirmed = await overlays.openConfirm(
      i18n.translate('savedObjectsManagement.deleteConfirm.modalDescription', {
        defaultMessage: 'This action permanently removes the object from Kibana.',
      }),
      {
        confirmButtonText: i18n.translate(
          'savedObjectsManagement.deleteConfirm.modalDeleteButtonLabel',
          {
            defaultMessage: 'Delete',
          }
        ),
        title: i18n.translate('savedObjectsManagement.deleteConfirm.modalTitle', {
          defaultMessage: `Delete '{title}'?`,
          values: {
            title: object?.attributes?.title || 'saved Kibana object',
          },
        }),
        buttonColor: 'danger',
      }
    );
    if (confirmed) {
      await savedObjectsClient.delete(type, id);
      notifications.toasts.addSuccess(`Deleted '${object!.attributes.title}' ${type} object`);
      this.redirectToListing();
    }
  }

  saveChanges = async ({ attributes, references }: SubmittedFormData) => {
    const { savedObjectsClient, notifications } = this.props;
    const { object, type } = this.state;

    await savedObjectsClient.update(object!.type, object!.id, attributes, { references });
    notifications.toasts.addSuccess(`Updated '${attributes.title}' ${type} object`);
    this.redirectToListing();
  };

  redirectToListing() {
    this.props.history.push('/');
  }
}

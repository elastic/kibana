/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexItem, EuiFlexGroup } from '@elastic/eui';
import { get } from 'lodash';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import {
  Capabilities,
  SavedObjectsClientContract,
  OverlayStart,
  NotificationsStart,
  ScopedHistory,
  HttpSetup,
  IUiSettingsClient,
  DocLinksStart,
} from '@kbn/core/public';
import { Header, Inspect, NotFoundErrors } from './components';
import { bulkGetObjects } from '../../lib/bulk_get_objects';
import { SavedObjectWithMetadata } from '../../types';
import './saved_object_view.scss';
export interface SavedObjectEditionProps {
  id: string;
  savedObjectType: string;
  http: HttpSetup;
  capabilities: Capabilities;
  overlays: OverlayStart;
  notifications: NotificationsStart;
  notFoundType?: string;
  savedObjectsClient: SavedObjectsClientContract;
  history: ScopedHistory;
  uiSettings: IUiSettingsClient;
  docLinks: DocLinksStart['links'];
}
export interface SavedObjectEditionState {
  type: string;
  object?: SavedObjectWithMetadata<any>;
}

const unableFindSavedObjectNotificationMessage = i18n.translate(
  'savedObjectsManagement.objectView.unableFindSavedObjectNotificationMessage',
  { defaultMessage: 'Unable to find saved object' }
);
export class SavedObjectEdition extends Component<
  SavedObjectEditionProps,
  SavedObjectEditionState
> {
  constructor(props: SavedObjectEditionProps) {
    super(props);

    const { savedObjectType: type } = props;

    this.state = {
      object: undefined,
      type,
    };
  }

  componentDidMount() {
    const { http, id, notifications } = this.props;
    const { type } = this.state;
    bulkGetObjects(http, [{ type, id }])
      .then(([object]) => {
        if (object.error) {
          const { message } = object.error;
          notifications.toasts.addDanger({
            title: unableFindSavedObjectNotificationMessage,
            text: message,
          });
        } else {
          this.setState({ object });
        }
      })
      .catch((err) => {
        notifications.toasts.addDanger({
          title: unableFindSavedObjectNotificationMessage,
          text: err.message ?? 'Unknown error',
        });
      });
  }

  canViewInApp(capabilities: Capabilities, obj?: SavedObjectWithMetadata<any>) {
    return obj && obj.meta.inAppUrl
      ? get(capabilities, obj?.meta.inAppUrl?.uiCapabilitiesPath, false) &&
          Boolean(obj?.meta.inAppUrl?.path)
      : false;
  }

  render() {
    const { capabilities, notFoundType, http, uiSettings, docLinks } = this.props;
    const { object } = this.state;
    const { delete: canDelete } = capabilities.savedObjectsManagement as Record<string, boolean>;
    const canView = this.canViewInApp(capabilities, object);
    return (
      <KibanaContextProvider services={{ uiSettings }}>
        <EuiFlexGroup
          direction="column"
          data-test-subject="savedObjectsEdit"
          className="savedObjectsManagementObjectView"
        >
          <EuiFlexItem grow={false}>
            <Header
              canDelete={canDelete && !object?.meta.hiddenType}
              canViewInApp={canView}
              onDeleteClick={() => this.delete()}
              viewUrl={http.basePath.prepend(object?.meta.inAppUrl?.path || '')}
              title={object?.meta.title}
            />
          </EuiFlexItem>
          {notFoundType && (
            <EuiFlexItem grow={false}>
              <NotFoundErrors type={notFoundType} docLinks={docLinks} />
            </EuiFlexItem>
          )}
          {object && (
            <EuiFlexItem grow={true}>
              <Inspect object={object} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </KibanaContextProvider>
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

  redirectToListing() {
    this.props.history.push('/');
  }
}

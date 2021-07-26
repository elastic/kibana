/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { XJsonLang } from '@kbn/monaco';
import { get, omit } from 'lodash';
import {
  Capabilities,
  SavedObjectsClientContract,
  OverlayStart,
  NotificationsStart,
  ScopedHistory,
  HttpSetup,
  IUiSettingsClient,
} from '../../../../../core/public';
import { Header, NotFoundErrors } from './components';
import { bulkGetObjects } from '../../lib';
import { CodeEditor, KibanaContextProvider } from '../../../../kibana_react/public';
import { SavedObjectWithMetadata } from '../../types';

interface SavedObjectEditionProps {
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
}

interface SavedObjectEditionState {
  type: string;
  object?: SavedObjectWithMetadata<any>;
}

const unableFindSavedObjectNotificationMessage = i18n.translate(
  'savedObjectsManagement.objectView.unableFindSavedObjectNotificationMessage',
  { defaultMessage: 'Unable to find saved object' }
);

const noOp = () => {};

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

  render() {
    const { capabilities, notFoundType, http, uiSettings } = this.props;
    const { object } = this.state;
    const { delete: canDelete } = capabilities.savedObjectsManagement as Record<string, boolean>;
    const canView =
      object && object.meta.inAppUrl
        ? get(capabilities, object?.meta.inAppUrl?.uiCapabilitiesPath, false) &&
          Boolean(object?.meta.inAppUrl?.path)
        : false;

    const objectAsJsonString = object ? JSON.stringify(omit(object, 'meta'), null, 2) : '';

    return (
      <KibanaContextProvider services={{ uiSettings }}>
        <EuiFlexGroup
          direction="column"
          data-test-subj="savedObjectsEdit"
          style={{ height: '100%' }}
        >
          <EuiFlexItem grow={false}>
            <Header
              canDelete={Boolean(object) && canDelete && !object?.meta.hiddenType}
              canViewInApp={canView}
              onDeleteClick={() => this.delete()}
              viewUrl={http.basePath.prepend(object?.meta.inAppUrl?.path || '')}
            />
          </EuiFlexItem>
          {notFoundType && (
            <EuiFlexItem grow={false}>
              <NotFoundErrors type={notFoundType} />
            </EuiFlexItem>
          )}
          {object && (
            <EuiFlexItem grow={true}>
              <CodeEditor
                languageId={XJsonLang.ID}
                value={objectAsJsonString}
                onChange={noOp}
                aria-label={'TODO'}
                height={'100%'}
                options={{
                  automaticLayout: false,
                  fontSize: 12,
                  lineNumbers: 'on',
                  minimap: {
                    enabled: false,
                  },
                  overviewRulerBorder: false,
                  readOnly: true,
                  scrollbar: {
                    alwaysConsumeMouseWheel: false,
                  },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  wrappingIndent: 'indent',
                }}
              />
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

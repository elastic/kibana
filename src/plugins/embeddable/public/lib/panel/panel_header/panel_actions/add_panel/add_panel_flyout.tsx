/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { CoreSetup } from 'src/core/public';

import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';

import { EmbeddableStart } from 'src/plugins/embeddable/public';
import { IContainer } from '../../../../containers';
import { EmbeddableFactoryNotFoundError } from '../../../../errors';
import { SavedObjectEmbeddableInput } from '../../../../embeddables';

interface Props {
  onClose: () => void;
  container: IContainer;
  getFactory: EmbeddableStart['getEmbeddableFactory'];
  getAllFactories: EmbeddableStart['getEmbeddableFactories'];
  notifications: CoreSetup['notifications'];
  SavedObjectFinder: React.ComponentType<any>;
}

interface State {
  isCreateMenuOpen: boolean;
}

export class AddPanelFlyout extends React.Component<Props, State> {
  private lastToast: any;

  public state = {
    isCreateMenuOpen: false,
  };

  constructor(props: Props) {
    super(props);
  }

  public showToast = (name: string) => {
    // To avoid the clutter of having toast messages cover flyout
    // close previous toast message before creating a new one
    if (this.lastToast) {
      this.props.notifications.toasts.remove(this.lastToast);
    }

    this.lastToast = this.props.notifications.toasts.addSuccess({
      title: i18n.translate(
        'embeddableApi.addPanel.savedObjectAddedToContainerSuccessMessageTitle',
        {
          defaultMessage: '{savedObjectName} was added',
          values: {
            savedObjectName: name,
          },
        }
      ),
      'data-test-subj': 'addObjectToContainerSuccess',
    });
  };

  public createNewEmbeddable = async (type: string) => {
    this.props.onClose();
    const factory = this.props.getFactory(type);

    if (!factory) {
      throw new EmbeddableFactoryNotFoundError(type);
    }

    const explicitInput = await factory.getExplicitInput();
    const embeddable = await this.props.container.addNewEmbeddable(type, explicitInput);
    if (embeddable) {
      this.showToast(embeddable.getInput().title || '');
    }
  };

  public onAddPanel = async (savedObjectId: string, savedObjectType: string, name: string) => {
    const factoryForSavedObjectType = [...this.props.getAllFactories()].find(
      (factory) =>
        factory.savedObjectMetaData && factory.savedObjectMetaData.type === savedObjectType
    );
    if (!factoryForSavedObjectType) {
      throw new EmbeddableFactoryNotFoundError(savedObjectType);
    }

    this.props.container.addNewEmbeddable<SavedObjectEmbeddableInput>(
      factoryForSavedObjectType.type,
      { savedObjectId }
    );

    this.showToast(name);
  };

  public render() {
    const SavedObjectFinder = this.props.SavedObjectFinder;
    const metaData = [...this.props.getAllFactories()]
      .filter(
        (embeddableFactory) =>
          Boolean(embeddableFactory.savedObjectMetaData) && !embeddableFactory.isContainerType
      )
      .map(({ savedObjectMetaData }) => savedObjectMetaData as any);
    const savedObjectsFinder = (
      <SavedObjectFinder
        onChoose={this.onAddPanel}
        savedObjectMetaData={metaData}
        showFilter={true}
        noItemsMessage={i18n.translate('embeddableApi.addPanel.noMatchingObjectsMessage', {
          defaultMessage: 'No matching objects found.',
        })}
      />
    );

    return (
      <>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage
                id="embeddableApi.addPanel.Title"
                defaultMessage="Add from library"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{savedObjectsFinder}</EuiFlyoutBody>
      </>
    );
  }
}

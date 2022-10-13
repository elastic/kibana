/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { ReactElement } from 'react';
import { METRIC_TYPE } from '@kbn/analytics';
import { CoreSetup, SavedObjectAttributes, SimpleSavedObject, Toast } from '@kbn/core/public';

import { EuiContextMenuItem, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';

import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { EmbeddableFactory, EmbeddableStart } from '../../../../..';
import { IContainer } from '../../../../containers';
import { EmbeddableFactoryNotFoundError } from '../../../../errors';
import { SavedObjectFinderCreateNew } from './saved_object_finder_create_new';
import { SavedObjectEmbeddableInput } from '../../../../embeddables';

interface Props {
  onClose: () => void;
  container: IContainer;
  getFactory: EmbeddableStart['getEmbeddableFactory'];
  getAllFactories: EmbeddableStart['getEmbeddableFactories'];
  notifications: CoreSetup['notifications'];
  SavedObjectFinder: React.ComponentType<any>;
  showCreateNewMenu?: boolean;
  reportUiCounter?: UsageCollectionStart['reportUiCounter'];
}

interface State {
  isCreateMenuOpen: boolean;
}

function capitalize([first, ...letters]: string) {
  return `${first.toUpperCase()}${letters.join('')}`;
}

export class AddPanelFlyout extends React.Component<Props, State> {
  private lastToast?: string | Toast;

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

  public onAddPanel = async (
    savedObjectId: string,
    savedObjectType: string,
    name: string,
    so: SimpleSavedObject<SavedObjectAttributes>
  ) => {
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

    this.doTelemetryForAddEvent(this.props.container.type, factoryForSavedObjectType, so);

    this.showToast(name);
  };

  private doTelemetryForAddEvent(
    appName: string,
    factoryForSavedObjectType: EmbeddableFactory,
    so: SimpleSavedObject<SavedObjectAttributes>
  ) {
    const { reportUiCounter } = this.props;

    if (reportUiCounter) {
      const type = factoryForSavedObjectType.savedObjectMetaData?.getSavedObjectSubType
        ? factoryForSavedObjectType.savedObjectMetaData.getSavedObjectSubType(so)
        : factoryForSavedObjectType.type;

      reportUiCounter(appName, METRIC_TYPE.CLICK, `${type}:add`);
    }
  }

  private getCreateMenuItems(): ReactElement[] {
    return [...this.props.getAllFactories()]
      .filter(
        // @ts-expect-error ts 4.5 upgrade
        (factory) => factory.isEditable() && !factory.isContainerType && factory.canCreateNew()
      )
      .map((factory) => (
        <EuiContextMenuItem
          key={factory.type}
          data-test-subj={`createNew-${factory.type}`}
          onClick={() => this.createNewEmbeddable(factory.type)}
          className="embPanel__addItem"
        >
          {capitalize(factory.getDisplayName())}
        </EuiContextMenuItem>
      ));
  }

  public render() {
    const SavedObjectFinder = this.props.SavedObjectFinder;
    const metaData = [...this.props.getAllFactories()]
      .filter(
        (embeddableFactory) =>
          Boolean(embeddableFactory.savedObjectMetaData) && !embeddableFactory.isContainerType
      )
      .map(({ savedObjectMetaData }) => savedObjectMetaData);
    const savedObjectsFinder = (
      <SavedObjectFinder
        onChoose={this.onAddPanel}
        savedObjectMetaData={metaData}
        showFilter={true}
        noItemsMessage={i18n.translate('embeddableApi.addPanel.noMatchingObjectsMessage', {
          defaultMessage: 'No matching objects found.',
        })}
      >
        {this.props.showCreateNewMenu ? (
          <SavedObjectFinderCreateNew menuItems={this.getCreateMenuItems()} />
        ) : null}
      </SavedObjectFinder>
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

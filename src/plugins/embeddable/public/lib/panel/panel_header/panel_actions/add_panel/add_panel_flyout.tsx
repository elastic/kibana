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
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { ReactElement } from 'react';
import { CoreSetup } from 'src/core/public';

import { EuiContextMenuItem, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';

import { EmbeddableStart } from 'src/plugins/embeddable/public';
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
}

interface State {
  isCreateMenuOpen: boolean;
}

function capitalize([first, ...letters]: string) {
  return `${first.toUpperCase()}${letters.join('')}`;
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

  private getCreateMenuItems(): ReactElement[] {
    return [...this.props.getAllFactories()]
      .filter(
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
      .map(({ savedObjectMetaData }) => savedObjectMetaData as any);
    const savedObjectsFinder = (
      <SavedObjectFinder
        onChoose={this.onAddPanel}
        savedObjectMetaData={metaData}
        showFilter={true}
        noItemsMessage={i18n.translate('embeddableApi.addPanel.noMatchingObjectsMessage', {
          defaultMessage: 'No matching objects found.',
        })}
      >
        <SavedObjectFinderCreateNew menuItems={this.getCreateMenuItems()} />
      </SavedObjectFinder>
    );

    return (
      <>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage id="embeddableApi.addPanel.Title" defaultMessage="Add panels" />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{savedObjectsFinder}</EuiFlyoutBody>
      </>
    );
  }
}

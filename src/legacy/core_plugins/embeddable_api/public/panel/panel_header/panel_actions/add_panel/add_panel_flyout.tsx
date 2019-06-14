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
import React from 'react';
import { toastNotifications } from 'ui/notify';
import {
  SavedObjectFinder,
  SavedObjectMetaData,
} from 'ui/saved_objects/components/saved_object_finder';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  // @ts-ignore
  EuiSuperSelect,
  EuiTitle,
  EuiText,
} from '@elastic/eui';

import { SavedObjectAttributes } from '../../../../../../../server/saved_objects';
import { EmbeddableFactoryNotFoundError } from '../../../../embeddables/embeddable_factory_not_found_error';
import { IContainer } from '../../../../containers';

interface Props {
  onClose: () => void;
  container: IContainer;
}

export class AddPanelFlyout extends React.Component<Props> {
  private lastToast: any;

  constructor(props: Props) {
    super(props);
  }

  public showToast = (name: string) => {
    // To avoid the clutter of having toast messages cover flyout
    // close previous toast message before creating a new one
    if (this.lastToast) {
      toastNotifications.remove(this.lastToast);
    }

    this.lastToast = toastNotifications.addSuccess({
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
    const factory = this.props.container.embeddableFactories.get(type);

    if (!factory) {
      throw new EmbeddableFactoryNotFoundError(type);
    }

    const explicitInput = await factory.getExplicitInput();
    const embeddable = await this.props.container.addNewEmbeddable(type, explicitInput);
    if (embeddable) {
      this.showToast(embeddable.getInput().title || '');
    }
  };

  public onAddPanel = async (id: string, type: string, name: string) => {
    this.props.container.addSavedObjectEmbeddable(type, id);

    this.showToast(name);
  };

  private getSelectCreateNewOptions() {
    return [
      {
        value: 'createNew',
        inputDisplay: (
          <EuiText>
            <FormattedMessage
              id="embeddableApi.addPanel.createNewDefaultOption"
              defaultMessage="Create new ..."
            />
          </EuiText>
        ),
      },

      ...this.props.container.embeddableFactories
        .getAll()
        .filter(
          factory => factory.isEditable() && !factory.isContainerType && factory.canCreateNew()
        )
        .map(factory => ({
          inputDisplay: (
            <EuiText>
              <FormattedMessage
                id="embeddableApi.addPanel.createNew"
                defaultMessage="Create new {factoryName}"
                values={{
                  factoryName: factory.getDisplayName(),
                }}
              />
            </EuiText>
          ),
          value: factory.type,
          'data-test-subj': `createNew-${factory.type}`,
        })),
    ];
  }

  public render() {
    return (
      <EuiFlyout ownFocus onClose={this.props.onClose} data-test-subj="dashboardAddPanel">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage id="embeddableApi.addPanel.Title" defaultMessage="Add panels" />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <SavedObjectFinder
            onChoose={this.onAddPanel}
            savedObjectMetaData={
              this.props.container.embeddableFactories
                .getAll()
                .filter(
                  embeddableFactory =>
                    Boolean(embeddableFactory.savedObjectMetaData) &&
                    !embeddableFactory.isContainerType
                )
                .map(({ savedObjectMetaData }) => savedObjectMetaData) as Array<
                SavedObjectMetaData<SavedObjectAttributes>
              >
            }
            showFilter={true}
            noItemsMessage={i18n.translate('embeddableApi.addPanel.noMatchingObjectsMessage', {
              defaultMessage: 'No matching objects found.',
            })}
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={true}>
              <EuiSuperSelect
                data-test-subj="createNew"
                options={this.getSelectCreateNewOptions()}
                valueOfSelected="createNew"
                onChange={(value: string) => this.createNewEmbeddable(value)}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
}

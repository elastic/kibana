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
import { CoreSetup, SavedObject } from 'src/core/public';
import { DashboardPanelState } from 'src/legacy/core_plugins/dashboard_embeddable_container/public/np_ready/public';

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

import { IContainer } from '../../../../containers';
import { EmbeddableFactoryNotFoundError } from '../../../../errors';
import { GetEmbeddableFactory, GetEmbeddableFactories } from '../../../../types';

interface Props {
  onClose: () => void;
  container: IContainer;
  getFactory: GetEmbeddableFactory;
  getAllFactories: GetEmbeddableFactories;
  notifications: CoreSetup['notifications'];
  SavedObjectFinder: React.ComponentType<any>;
  viewToRemove: IContainer;
}

export class ChangeViewFlyout extends React.Component<Props> {
  private lastToast: any;

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

  public onAddPanel = async (id: string, type: string, name: string) => {
    if (this.props.viewToRemove.parent) {
      /*
      //const dashProps=this.props.viewToRemove.parent.getInput();
      //var oldViewProps=(dashProps.panels[this.props.viewToRemove.id] as DashboardPanelState);


      this.props.viewToRemove.parent.removeEmbeddable(this.props.viewToRemove.id);
      this.props.container.addSavedObjectEmbeddable(type, id);
      console.log(id);

      const dashProps2=this.props.container.getInput();
      console.log(dashProps2.panels);


      //console.log((dashProps.panels[this.props.viewToRemove.id] as DashboardPanelState).gridData.w);
      //(dashProps.panels[this.props.viewToRemove.id] as DashboardPanelState).gridData.w=4;

      //this.props.viewToRemove.updateInput({panel: {gridData: {w:4}  }});
      */
      this.showToast(name);
    }
  };

  public render() {
    const SavedObjectFinder = this.props.SavedObjectFinder;
    const savedObjectsFinder = (
      <SavedObjectFinder
        onChoose={this.onAddPanel}
        savedObjectMetaData={[...this.props.getAllFactories()]
          .filter(
            embeddableFactory =>
              Boolean(embeddableFactory.savedObjectMetaData) && !embeddableFactory.isContainerType
          )
          .map(({ savedObjectMetaData }) => savedObjectMetaData as any)}
        showFilter={true}
        noItemsMessage={i18n.translate('embeddableApi.addPanel.noMatchingObjectsMessage', {
          defaultMessage: 'No matching objects found.',
        })}
      />
    );

    const vtr = 'Substitute view ' + this.props.viewToRemove.getTitle() + ' with...';

    return (
      <EuiFlyout ownFocus onClose={this.props.onClose} data-test-subj="dashboardAddPanel">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <FormattedMessage id="embeddableApi.addPanel.Title" defaultMessage={vtr} />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{savedObjectsFinder}</EuiFlyoutBody>
        {/*
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
        </EuiFlyoutFooter>*/}
      </EuiFlyout>
    );
  }
}

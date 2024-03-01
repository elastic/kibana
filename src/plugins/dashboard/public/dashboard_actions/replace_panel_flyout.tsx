/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import React from 'react';

import { Toast } from '@kbn/core/public';
import { getPanelTitle } from '@kbn/presentation-publishing';
import { pluginServices } from '../services/plugin_services';
import { ReplacePanelActionApi } from './replace_panel_action';
import { dashboardReplacePanelActionStrings } from './_dashboard_actions_strings';
import { ReplacePanelSOFinder } from '.';

interface Props {
  api: ReplacePanelActionApi;
  savedObjectsFinder: ReplacePanelSOFinder;
  onClose: () => void;
}

export class ReplacePanelFlyout extends React.Component<Props> {
  private lastToast: Toast = {
    id: 'panelReplaceToast',
  };

  constructor(props: Props) {
    super(props);
  }

  public showToast = (name: string) => {
    const {
      notifications: { toasts },
    } = pluginServices.getServices();

    // To avoid the clutter of having toast messages cover flyout
    // close previous toast message before creating a new one
    if (this.lastToast) {
      toasts.remove(this.lastToast);
    }

    this.lastToast = toasts.addSuccess({
      title: dashboardReplacePanelActionStrings.getSuccessMessage(name),
      'data-test-subj': 'addObjectToContainerSuccess',
    });
  };

  public onReplacePanel = async (savedObjectId: string, type: string, name: string) => {
    this.props.api.parentApi.replacePanel(this.props.api.uuid, {
      panelType: type,
      initialState: { savedObjectId },
    });
    this.showToast(name);
    this.props.onClose();
  };

  public render() {
    const {
      embeddable: { getEmbeddableFactories },
    } = pluginServices.getServices();

    const SavedObjectFinder = this.props.savedObjectsFinder;
    const savedObjectsFinder = (
      <SavedObjectFinder
        noItemsMessage={dashboardReplacePanelActionStrings.getNoMatchingObjectsMessage()}
        savedObjectMetaData={[...getEmbeddableFactories()]
          .filter(
            (embeddableFactory) =>
              Boolean(embeddableFactory.savedObjectMetaData) && !embeddableFactory.isContainerType
          )
          .map(({ savedObjectMetaData }) => savedObjectMetaData as any)}
        showFilter={true}
        onChoose={this.onReplacePanel}
      />
    );

    return (
      <>
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2>
              <span>
                {dashboardReplacePanelActionStrings.getFlyoutHeader(getPanelTitle(this.props.api))}
              </span>
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{savedObjectsFinder}</EuiFlyoutBody>
      </>
    );
  }
}

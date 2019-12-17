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

import React from 'react';

import { EuiModal, EuiOverlayMask } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { VisualizeConstants } from '../../../kibana/public/visualize/visualize_constants';
import { SearchSelection } from './search_selection';
import { TypeSelection } from './type_selection';
import { VisType, VisTypeAlias } from '../np_ready/public/types';
import { getUISettings, getHttp, getTypes, getSavedObjects } from '../np_ready/public/services';

import { createUiStatsReporter, METRIC_TYPE } from '../../../ui_metric/public';

interface TypeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  editorParams?: string[];
}

interface TypeSelectionState {
  showSearchVisModal: boolean;
  visType?: VisType;
}

const baseUrl = `#${VisualizeConstants.CREATE_PATH}?`;

class NewVisModal extends React.Component<TypeSelectionProps, TypeSelectionState> {
  public static defaultProps = {
    editorParams: [],
  };

  private readonly isLabsEnabled: boolean;
  private readonly trackUiMetric: ReturnType<typeof createUiStatsReporter>;

  constructor(props: TypeSelectionProps) {
    super(props);
    this.isLabsEnabled = getUISettings().get('visualize:enableLabs');

    this.state = {
      showSearchVisModal: false,
    };

    this.trackUiMetric = createUiStatsReporter('visualize');
  }

  public render() {
    if (!this.props.isOpen) {
      return null;
    }

    const visNewVisDialogAriaLabel = i18n.translate(
      'visualizations.newVisWizard.helpTextAriaLabel',
      {
        defaultMessage:
          'Start creating your visualization by selecting a type for that visualization. Hit escape to close this modal. Hit Tab key to go further.',
      }
    );

    const selectionModal =
      this.state.showSearchVisModal && this.state.visType ? (
        <EuiModal onClose={this.onCloseModal} className="visNewVisSearchDialog">
          <SearchSelection
            onSearchSelected={this.onSearchSelected}
            visType={this.state.visType}
            uiSettings={getUISettings()}
            savedObjects={getSavedObjects()}
          />
        </EuiModal>
      ) : (
        <EuiModal
          onClose={this.onCloseModal}
          className="visNewVisDialog"
          aria-label={visNewVisDialogAriaLabel}
          role="menu"
        >
          <TypeSelection
            showExperimental={this.isLabsEnabled}
            onVisTypeSelected={this.onVisTypeSelected}
            visTypesRegistry={getTypes()}
          />
        </EuiModal>
      );

    return <EuiOverlayMask>{selectionModal}</EuiOverlayMask>;
  }

  private onCloseModal = () => {
    this.setState({ showSearchVisModal: false });
    this.props.onClose();
  };

  private onVisTypeSelected = (visType: VisType | VisTypeAlias) => {
    if (!('aliasUrl' in visType) && visType.requiresSearch && visType.options.showIndexSelection) {
      this.setState({
        showSearchVisModal: true,
        visType,
      });
    } else {
      this.redirectToVis(visType);
    }
  };

  private onSearchSelected = (searchId: string, searchType: string) => {
    this.redirectToVis(this.state.visType!, searchType, searchId);
  };

  private redirectToVis(visType: VisType | VisTypeAlias, searchType?: string, searchId?: string) {
    this.trackUiMetric(METRIC_TYPE.CLICK, visType.name);

    if ('aliasUrl' in visType) {
      window.location.assign(getHttp().basePath.prepend(visType.aliasUrl));
      if (this.props.editorParams && this.props.editorParams.includes('addToDashboard')) {
        this.props.onClose();
      }

      return;
    }

    let params = [`type=${encodeURIComponent(visType.name)}`];

    if (searchType) {
      params.push(`${searchType === 'search' ? 'savedSearchId' : 'indexPattern'}=${searchId}`);
    }
    params = params.concat(this.props.editorParams!);

    this.props.onClose();
    location.assign(`${baseUrl}${params.join('&')}`);
  }
}

export { NewVisModal };

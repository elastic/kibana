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

import chrome from 'ui/chrome';
import { VisType } from 'ui/vis';
import { VisualizeConstants } from '../visualize_constants';

import { SearchSelection } from './search_selection';
import { TypeSelection } from './type_selection';

interface TypeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  visTypesRegistry: VisType[];
  editorParams?: string[];
  onCreate?: (options: { visType: string, searchId?: string, searchType?: string }) => void;
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

  constructor(props: TypeSelectionProps) {
    super(props);
    this.isLabsEnabled = chrome.getUiSettingsClient().get('visualize:enableLabs');

    this.state = {
      showSearchVisModal: false,
    };
  }

  public render() {
    if (!this.props.isOpen) {
      return null;
    }

    const visNewVisDialogAriaLabel = i18n.translate(
      'kbn.visualize.newVisWizard.helpTextAriaLabel',
      {
        defaultMessage:
          'Start creating your visualization by selecting a type for that visualization. Hit escape to close this modal. Hit Tab key to go further.',
      }
    );

    const selectionModal =
      this.state.showSearchVisModal && this.state.visType ? (
        <EuiModal onClose={this.onCloseModal} className="visNewVisSearchDialog">
          <SearchSelection onSearchSelected={this.onSearchSelected} visType={this.state.visType} />
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
            visTypesRegistry={this.props.visTypesRegistry}
          />
        </EuiModal>
      );

    return <EuiOverlayMask>{selectionModal}</EuiOverlayMask>;
  }

  private onCloseModal = () => {
    this.setState({ showSearchVisModal: false });
    this.props.onClose();
  };

  private onVisTypeSelected = (visType: VisType) => {
    if (visType.requiresSearch && visType.options.showIndexSelection) {
      this.setState({
        showSearchVisModal: true,
        visType,
      });
    } else {
      const params = [`type=${encodeURIComponent(visType.name)}`, ...this.props.editorParams!];
      this.props.onClose();
      if (!this.props.onCreate) {
        location.assign(`${baseUrl}${params.join('&')}`);
      } else {
        this.props.onCreate({ visType: this.state.visType!.name });
      }
    }
  };

  private onSearchSelected = (searchId: string, searchType: string) => {
    this.props.onClose();

    const params = [
      `type=${encodeURIComponent(this.state.visType!.name)}`,
      `${searchType === 'search' ? 'savedSearchId' : 'indexPattern'}=${searchId}`,
      ...this.props.editorParams!,
    ];
    if (!this.props.onCreate) {
      location.assign(`${baseUrl}${params.join('&')}`);
    } else {
      this.props.onCreate({ visType: this.state.visType!.name, searchType, searchId });
    }
  };
}

export { NewVisModal };

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

import { VisualizeConstants } from '../visualize_constants';

import { TypeSelection } from './type_selection';

import chrome from 'ui/chrome';
import { VisType } from 'ui/vis';

interface TypeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  visTypesRegistry: VisType[];
  editorParams?: string[];
}

class NewVisModal extends React.Component<TypeSelectionProps> {
  public static defaultProps = {
    editorParams: [],
  };

  private readonly isLabsEnabled: boolean;

  constructor(props: TypeSelectionProps) {
    super(props);
    this.isLabsEnabled = chrome.getUiSettingsClient().get('visualize:enableLabs');
  }

  public render() {
    if (!this.props.isOpen) {
      return null;
    }

    return (
      <EuiOverlayMask>
        <EuiModal onClose={this.props.onClose} maxWidth={'100vw'} className="visNewVisDialog">
          <TypeSelection
            showExperimental={this.isLabsEnabled}
            onVisTypeSelected={this.onVisTypeSelected}
            visTypesRegistry={this.props.visTypesRegistry}
          />
        </EuiModal>
      </EuiOverlayMask>
    );
  }

  private onVisTypeSelected = (visType: VisType) => {
    const baseUrl =
      visType.requiresSearch && visType.options.showIndexSelection
        ? `#${VisualizeConstants.WIZARD_STEP_2_PAGE_PATH}?`
        : `#${VisualizeConstants.CREATE_PATH}?`;
    const params = [`type=${encodeURIComponent(visType.name)}`, ...this.props.editorParams!];
    this.props.onClose();
    location.assign(`${baseUrl}${params.join('&')}`);
  };
}

export { NewVisModal };

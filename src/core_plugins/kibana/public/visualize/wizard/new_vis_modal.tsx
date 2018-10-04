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

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiKeyPadMenu,
  EuiKeyPadMenuItemButton,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { VisualizeConstants } from '../visualize_constants';

import classnames from 'classnames';
import { sortByOrder } from 'lodash';
import React, { ChangeEvent } from 'react';

import chrome from 'ui/chrome';
import { memoizeLast } from 'ui/utils/memoize';
import { VisType } from 'ui/vis';
import { CATEGORY } from 'ui/vis/vis_category';

interface VisTypeListEntry extends VisType {
  highlighted: boolean;
}

interface TypeSelectionProps {
  isOpen: boolean;
  onClose: () => void;
  visTypesRegistry: VisType[];
  editorParams: string[];
}

interface TypeSelectionState {
  highlightedType: VisType | null;
  query: string;
}

class NewVisModal extends React.Component<TypeSelectionProps, TypeSelectionState> {
  public static defaultProps = {
    editorParams: [],
  };

  public state = {
    highlightedType: null,
    query: '',
  };

  private readonly getFilteredVisTypes = memoizeLast(this.filteredVisTypes);
  private readonly isLabsEnabled: boolean;

  constructor(props: TypeSelectionProps) {
    super(props);
    this.isLabsEnabled = chrome.getUiSettingsClient().get('visualize:enableLabs');
  }

  public render() {
    if (!this.props.isOpen) {
      return null;
    }

    const { highlightedType, query } = this.state;

    const visTypes = this.getFilteredVisTypes(this.props.visTypesRegistry, query);

    return (
      <EuiOverlayMask>
        <EuiModal onClose={this.props.onClose} maxWidth={false} className="visNewVisDialog">
          <EuiModalHeader>
            <EuiModalHeaderTitle>New visualization</EuiModalHeaderTitle>
          </EuiModalHeader>
          <EuiFlexGroup gutterSize="none">
            <EuiFlexItem grow={false}>
              <EuiModalBody className="visNewVisDialog__body">
                <EuiFlexGroup direction="column">
                  <EuiFlexItem grow={false}>
                    <EuiFieldSearch
                      placeholder="Filter"
                      value={query}
                      onChange={this.onQueryChange}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={true}>
                    <EuiKeyPadMenu className="visNewVisDialog__types">
                      {visTypes.map(this.renderVisType)}
                    </EuiKeyPadMenu>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiModalBody>
            </EuiFlexItem>
            <EuiFlexItem className="visNewVisDialog__description">
              {highlightedType && this.renderDescription(highlightedType)}
              {!highlightedType && (
                <React.Fragment>
                  <EuiTitle size="s">
                    <h2>Select a visualization type</h2>
                  </EuiTitle>
                  <EuiSpacer size="m" />
                  <EuiText>
                    <p>
                      Start creating your visualization by selecting a type for that visualization.
                    </p>
                  </EuiText>
                </React.Fragment>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiModal>
      </EuiOverlayMask>
    );
  }

  private renderDescription(visType: VisType) {
    return (
      <React.Fragment>
        <EuiTitle size="s">
          <h2>{visType.title}</h2>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText>{visType.description}</EuiText>
      </React.Fragment>
    );
  }

  private renderVisType = (visType: VisTypeListEntry) => {
    let stage = {};
    if (visType.stage === 'experimental') {
      stage = {
        betaBadgeLabel: 'Experimental',
        betaBadgeTooltipContent: 'This visualization is yet experimental.',
      };
    } else if (visType.stage === 'lab') {
      stage = {
        betaBadgeLabel: 'Lab',
        betaBadgeTooltipContent: 'This visualization is in an early experimental lab state.',
      };
    }
    const isDisabled = this.state.query !== '' && !visType.highlighted;
    const legacyIconClass = classnames(
      'kuiIcon',
      'visNewVisDialog__typeLegacyIcon',
      visType.legacyIcon
    );
    return (
      <EuiKeyPadMenuItemButton
        key={visType.name}
        label={visType.title}
        onClick={() => this.onSelectVisType(visType)}
        onFocus={() => this.highlightType(visType)}
        onMouseEnter={() => this.highlightType(visType)}
        onMouseLeave={() => this.highlightType(null)}
        onBlur={() => this.highlightType(null)}
        className="visNewVisDialog__type"
        data-test-subj={`visType-${visType.name}`}
        disabled={isDisabled}
        {...stage}
      >
        {visType.image && (
          <img src={visType.image} aria-hidden="true" className="visNewVisDialog__typeImage" />
        )}
        {!visType.image && visType.legacyIcon && <span className={legacyIconClass} />}
        {!visType.image &&
          !visType.legacyIcon && (
            <EuiIcon type={visType.icon} size="l" color="secondary" aria-hidden="true" />
          )}
      </EuiKeyPadMenuItemButton>
    );
  };

  private onSelectVisType(visType: VisTypeListEntry) {
    const baseUrl =
      visType.requiresSearch && visType.options.showIndexSelection
        ? `#${VisualizeConstants.WIZARD_STEP_2_PAGE_PATH}?`
        : `#${VisualizeConstants.CREATE_PATH}?`;
    const params = [`type=${encodeURIComponent(visType.name)}`, ...this.props.editorParams];
    location.href = `${baseUrl}${params.join('&')}`;
    this.props.onClose();
  }

  private onQueryChange = (ev: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      query: ev.target.value,
    });
  };

  private highlightType(visType: VisType | null) {
    this.setState({
      highlightedType: visType,
    });
  }

  private filteredVisTypes(visTypes: VisType[], query: string): VisTypeListEntry[] {
    const types = visTypes.filter(type => {
      // Filter out all lab visualizations if lab mode is not enabled
      if (!this.isLabsEnabled && type.stage === 'lab') {
        return false;
      }

      // Filter out visualizations in the hidden category
      if (type.category === CATEGORY.HIDDEN) {
        return false;
      }

      return true;
    });

    let entries: VisTypeListEntry[];
    if (!query) {
      entries = types.map(type => ({ ...type, highlighted: false }));
    } else {
      const q = query.toLowerCase();
      entries = types.map(type => {
        const matchesQuery =
          type.name.toLowerCase().includes(q) ||
          type.title.toLowerCase().includes(q) ||
          (typeof type.description === 'string' && type.description.toLowerCase().includes(q));
        return { ...type, highlighted: matchesQuery };
      });
    }

    return sortByOrder(entries, ['highlighted', 'title'], ['desc', 'asc']);
  }
}

export { NewVisModal };

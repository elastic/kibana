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
import { sortByOrder } from 'lodash';
import React, { ChangeEvent } from 'react';

import {
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiKeyPadMenu,
  EuiKeyPadMenuItemButton,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { memoizeLast } from 'ui/utils/memoize';
import { VisType } from 'ui/vis';
import { NewVisHelp } from './new_vis_help';
import { VisHelpText } from './vis_help_text';
import { VisTypeIcon } from './vis_type_icon';

interface VisTypeListEntry extends VisType {
  highlighted: boolean;
}

interface TypeSelectionProps {
  onVisTypeSelected: (visType: VisType) => void;
  visTypesRegistry: VisType[];
  showExperimental: boolean;
}

interface TypeSelectionState {
  highlightedType: VisType | null;
  query: string;
}

class TypeSelection extends React.Component<TypeSelectionProps, TypeSelectionState> {
  public state = {
    highlightedType: null,
    query: '',
  };

  private readonly getFilteredVisTypes = memoizeLast(this.filteredVisTypes);

  public render() {
    const { query, highlightedType } = this.state;
    const visTypes = this.getFilteredVisTypes(this.props.visTypesRegistry, query);
    return (
      <React.Fragment>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="kbn.visualize.newVisWizard.title"
              defaultMessage="New Visualization"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <div className="visNewVisDialog__body">
          <EuiFlexGroup gutterSize="xl">
            <EuiFlexItem>
              <EuiFlexGroup
                className="visNewVisDialog__list"
                direction="column"
                gutterSize="none"
                responsive={false}
              >
                <EuiFlexItem grow={false} className="visNewVisDialog__searchWrapper">
                  <EuiFieldSearch
                    placeholder="Filter"
                    value={query}
                    onChange={this.onQueryChange}
                    fullWidth
                    data-test-subj="filterVisType"
                    aria-label={i18n.translate(
                      'kbn.visualize.newVisWizard.filterVisTypeAriaLabel',
                      {
                        defaultMessage: 'Filter for a visualization type',
                      }
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={1} className="visNewVisDialog__typesWrapper">
                  <EuiScreenReaderOnly>
                    <span aria-live="polite">
                      {query && (
                        <FormattedMessage
                          id="kbn.visualize.newVisWizard.resultsFound"
                          defaultMessage="{resultCount} {resultCount, plural,
                            one {type}
                            other {types}
                          } found"
                          values={{ resultCount: visTypes.filter(type => type.highlighted).length }}
                        />
                      )}
                    </span>
                  </EuiScreenReaderOnly>
                  <EuiKeyPadMenu
                    className="visNewVisDialog__types"
                    data-test-subj="visNewDialogTypes"
                  >
                    {visTypes.map(this.renderVisType)}
                  </EuiKeyPadMenu>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem className="visNewVisDialog__description" grow={false}>
              {highlightedType ? (
                <VisHelpText visType={highlightedType} />
              ) : (
                <React.Fragment>
                  <EuiTitle size="s">
                    <h2>
                      <FormattedMessage
                        id="kbn.visualize.newVisWizard.selectVisType"
                        defaultMessage="Select a visualization type"
                      />
                    </h2>
                  </EuiTitle>
                  <EuiSpacer size="m" />
                  <NewVisHelp />
                </React.Fragment>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      </React.Fragment>
    );
  }

  private filteredVisTypes(visTypes: VisType[], query: string): VisTypeListEntry[] {
    const types = visTypes.filter(type => {
      // Filter out all lab visualizations if lab mode is not enabled
      if (!this.props.showExperimental && type.stage === 'experimental') {
        return false;
      }

      // Filter out hidden visualizations
      if (type.hidden) {
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

  private renderVisType = (visType: VisTypeListEntry) => {
    let stage = {};
    if (visType.stage === 'experimental') {
      stage = {
        betaBadgeLabel: i18n.translate('kbn.visualize.newVisWizard.experimentalTitle', {
          defaultMessage: 'Experimental',
        }),
        betaBadgeTooltipContent: i18n.translate('kbn.visualize.newVisWizard.experimentalTooltip', {
          defaultMessage:
            'This visualization might be changed or removed in a future release and is not subject to the support SLA.',
        }),
      };
    }
    const isDisabled = this.state.query !== '' && !visType.highlighted;
    return (
      <EuiKeyPadMenuItemButton
        key={visType.name}
        label={<span data-test-subj="visTypeTitle">{visType.title}</span>}
        onClick={() => this.props.onVisTypeSelected(visType)}
        onFocus={() => this.highlightType(visType)}
        onMouseEnter={() => this.highlightType(visType)}
        onMouseLeave={() => this.highlightType(null)}
        onBlur={() => this.highlightType(null)}
        className="visNewVisDialog__type"
        data-test-subj={`visType-${visType.name}`}
        data-vis-stage={visType.stage}
        disabled={isDisabled}
        aria-describedby={`visTypeDescription-${visType.name}`}
        role="menuitem"
        {...stage}
      >
        <VisTypeIcon visType={visType} />
      </EuiKeyPadMenuItemButton>
    );
  };

  private highlightType(visType: VisType | null) {
    this.setState({
      highlightedType: visType,
    });
  }

  private onQueryChange = (ev: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      query: ev.target.value,
    });
  };
}

export { TypeSelection };

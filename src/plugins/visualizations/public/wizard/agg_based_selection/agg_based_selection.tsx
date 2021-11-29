/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { orderBy } from 'lodash';
import React, { ChangeEvent } from 'react';

import {
  EuiFieldSearch,
  EuiFlexGrid,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiSpacer,
  EuiIcon,
  EuiCard,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';

import { memoizeLast } from '../../legacy/memoize';
import { VisGroups } from '../../vis_types/vis_groups_enum';
import type { BaseVisType, TypesStart } from '../../vis_types';
import { DialogNavigation } from '../dialog_navigation';
import './agg_based_selection.scss';

interface VisTypeListEntry {
  type: BaseVisType;
  highlighted: boolean;
}

interface AggBasedSelectionProps {
  onVisTypeSelected: (visType: BaseVisType) => void;
  visTypesRegistry: TypesStart;
  toggleGroups: (flag: boolean) => void;
}
interface AggBasedSelectionState {
  query: string;
}

class AggBasedSelection extends React.Component<AggBasedSelectionProps, AggBasedSelectionState> {
  public state: AggBasedSelectionState = {
    query: '',
  };

  private readonly getFilteredVisTypes = memoizeLast(this.filteredVisTypes);

  public render() {
    const { query } = this.state;
    const visTypes = this.getFilteredVisTypes(this.props.visTypesRegistry, query);
    return (
      <>
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            <FormattedMessage
              id="visualizations.newVisWizard.title"
              defaultMessage="New visualization"
            />
          </EuiModalHeaderTitle>
        </EuiModalHeader>
        <EuiModalBody>
          <DialogNavigation goBack={() => this.props.toggleGroups(true)} />
          <EuiFieldSearch
            placeholder="Filter"
            value={query}
            onChange={this.onQueryChange}
            fullWidth
            data-test-subj="filterVisType"
            aria-label={i18n.translate('visualizations.newVisWizard.filterVisTypeAriaLabel', {
              defaultMessage: 'Filter for a visualization type',
            })}
          />
          <EuiSpacer />
          <EuiScreenReaderOnly>
            <span aria-live="polite">
              {query && (
                <FormattedMessage
                  id="visualizations.newVisWizard.resultsFound"
                  defaultMessage="{resultCount, plural, one {type} other {types}} found"
                  values={{
                    resultCount: visTypes.filter((type) => type.highlighted).length,
                  }}
                />
              )}
            </span>
          </EuiScreenReaderOnly>
          <EuiFlexGrid columns={3} data-test-subj="visNewDialogTypes">
            {visTypes.map(this.renderVisType)}
          </EuiFlexGrid>
        </EuiModalBody>
      </>
    );
  }

  private filteredVisTypes(visTypes: TypesStart, query: string): VisTypeListEntry[] {
    const types = visTypes.getByGroup(VisGroups.AGGBASED).filter((type) => {
      // Filter out hidden visualizations and visualizations that are only aggregations based
      return !type.hidden;
    });

    let entries: VisTypeListEntry[];
    if (!query) {
      entries = types.map((type) => ({ type, highlighted: false }));
    } else {
      const q = query.toLowerCase();
      entries = types.map((type) => {
        const matchesQuery =
          type.name.toLowerCase().includes(q) ||
          type.title.toLowerCase().includes(q) ||
          (typeof type.description === 'string' && type.description.toLowerCase().includes(q));
        return { type, highlighted: matchesQuery };
      });
    }

    return orderBy(entries, ['highlighted', 'type.title'], ['desc', 'asc']);
  }

  private renderVisType = (visType: VisTypeListEntry) => {
    const isDisabled = this.state.query !== '' && !visType.highlighted;
    const onClick = () => this.props.onVisTypeSelected(visType.type);

    return (
      <EuiFlexItem key={visType.type.name}>
        <EuiCard
          titleSize="xs"
          title={<span data-test-subj="visTypeTitle">{visType.type.title}</span>}
          onClick={onClick}
          data-test-subj={`visType-${visType.type.name}`}
          data-vis-stage={visType.type.stage}
          aria-label={`visType-${visType.type.name}`}
          description={visType.type.description || ''}
          layout="horizontal"
          isDisabled={isDisabled}
          icon={<EuiIcon type={visType.type.icon || 'empty'} size="l" color="success" />}
          className="aggBasedDialog__card"
        />
      </EuiFlexItem>
    );
  };

  private onQueryChange = (ev: ChangeEvent<HTMLInputElement>) => {
    this.setState({
      query: ev.target.value,
    });
  };
}

export { AggBasedSelection };

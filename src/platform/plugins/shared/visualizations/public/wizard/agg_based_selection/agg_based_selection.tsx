/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { orderBy } from 'lodash';
import React, { ChangeEvent, useCallback, useMemo, useState } from 'react';

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
  EuiSkeletonRectangle,
} from '@elastic/eui';

import { VisGroups } from '../../vis_types/vis_groups_enum';
import type { BaseVisType, TypesStart } from '../../vis_types';
import { DialogNavigation } from '../dialog_navigation';
import { useVisTypes } from '../../vis_types/use_vis_types';

interface AggBasedSelectionProps {
  openedAsRoot?: boolean;
  onVisTypeSelected: (visType: BaseVisType) => void;
  visTypesRegistry: TypesStart;
  showMainDialog: (flag: boolean) => void;
}

export function AggBasedSelection(props: AggBasedSelectionProps) {
  const [query, setQuery] = useState('');
  const onQueryChange = useCallback((ev: ChangeEvent<HTMLInputElement>) => {
    setQuery(ev.target.value);
  }, []);

  const { isLoading, visTypes } = useVisTypes(props.visTypesRegistry);

  const visTypesWithHighlight = useMemo(() => {
    const aggVisTypes = visTypes.filter((type) => {
      // Filter out hidden visualizations and visualizations that are only aggregations based
      return type.group === VisGroups.AGGBASED && !type.disableCreate;
    });

    const q = query.toLowerCase();
    const entries = !query
      ? aggVisTypes.map((type: any) => ({ type, highlighted: false }))
      : aggVisTypes.map((type) => {
        const matchesQuery =
          type.name.toLowerCase().includes(q) ||
          type.title.toLowerCase().includes(q) ||
          (typeof type.description === 'string' && type.description.toLowerCase().includes(q));
        return { type, highlighted: matchesQuery };
      });

    return orderBy(entries, ['highlighted', 'type.title'], ['desc', 'asc']);
  }, [query, visTypes]);  
  
  function renderVisType(visType: {
    type: BaseVisType;
    highlighted: boolean;
  }) {
    const isDisabled = query !== '' && !visType.highlighted;
    const onClick = () => props.onVisTypeSelected(visType.type);

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
          hasBorder={true}
        />
      </EuiFlexItem>
    );
  };
  
  return (
    <>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <FormattedMessage
            id="visualizations.newAggVisWizard.title"
            defaultMessage="New aggregation based visualization"
          />
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        {props.openedAsRoot ? null : (
          <DialogNavigation goBack={() => props.showMainDialog(true)} />
        )}
        <EuiFieldSearch
          placeholder="Filter"
          value={query}
          onChange={onQueryChange}
          fullWidth
          data-test-subj="filterVisType"
          aria-label={i18n.translate('visualizations.newVisWizard.filterVisTypeAriaLabel', {
            defaultMessage: 'Filter for a visualization type',
          })}
        />
        <EuiSpacer />
        <EuiSkeletonRectangle isLoading={isLoading}>
          <>
            <EuiScreenReaderOnly>
              <span aria-live="polite">
                {query && (
                  <FormattedMessage
                    id="visualizations.newVisWizard.resultsFound"
                    defaultMessage="{resultCount, plural, one {type} other {types}} found"
                    values={{
                      resultCount: visTypesWithHighlight.filter((type) => type.highlighted).length,
                    }}
                  />
                )}
              </span>
            </EuiScreenReaderOnly>
            <EuiFlexGrid columns={3} data-test-subj="visNewDialogTypes">
              {visTypesWithHighlight.map(renderVisType)}
            </EuiFlexGrid>
          </>
        </EuiSkeletonRectangle>
      </EuiModalBody>
    </>
  );
}
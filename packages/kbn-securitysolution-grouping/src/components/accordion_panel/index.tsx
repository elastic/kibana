/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import React, { useCallback, useMemo } from 'react';
import { firstNonNullValue } from '../../helpers';
import type { RawBucket } from '../types';
import { createGroupFilter } from './helpers';

export interface BadgeMetric {
  title: string;
  value: number;
  color?: string;
  width?: number;
}

export interface CustomMetric {
  title: string;
  customStatRenderer: JSX.Element;
}

interface GroupPanelProps<T> {
  customAccordionButtonClassName?: string;
  customAccordionClassName?: string;
  extraAction?: React.ReactNode;
  forceState?: 'open' | 'closed';
  groupBucket: RawBucket<T>;
  groupPanelRenderer?: JSX.Element;
  isLoading: boolean;
  level?: number;
  onToggleGroup?: (isOpen: boolean, groupBucket: RawBucket<T>) => void;
  renderChildComponent: (groupFilter: Filter[]) => React.ReactNode;
  selectedGroup: string;
}

const DefaultGroupPanelRenderer = ({ title }: { title: string }) => (
  <div>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem>
        <EuiTitle size="xs" className="euiAccordionForm__title">
          <h4 className="eui-textTruncate">{title}</h4>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  </div>
);

const GroupPanelComponent = <T,>({
  customAccordionButtonClassName = 'groupingAccordionForm__button',
  customAccordionClassName = 'groupingAccordionForm',
  extraAction,
  forceState,
  groupBucket,
  groupPanelRenderer,
  isLoading,
  level = 0,
  onToggleGroup,
  renderChildComponent,
  selectedGroup,
}: GroupPanelProps<T>) => {
  const groupFieldValue = useMemo(() => firstNonNullValue(groupBucket.key), [groupBucket.key]);

  const groupFilters = useMemo(
    () => createGroupFilter(selectedGroup, groupFieldValue),
    [groupFieldValue, selectedGroup]
  );

  const onToggle = useCallback(
    (isOpen) => {
      if (onToggleGroup) {
        onToggleGroup(isOpen, groupBucket);
      }
    },
    [groupBucket, onToggleGroup]
  );

  return !groupFieldValue ? null : (
    <EuiAccordion
      buttonClassName={customAccordionButtonClassName}
      buttonContent={
        <div className="groupingPanelRenderer">
          {groupPanelRenderer ?? <DefaultGroupPanelRenderer title={groupFieldValue} />}
        </div>
      }
      className={customAccordionClassName}
      data-test-subj="grouping-accordion"
      extraAction={extraAction}
      forceState={forceState}
      isLoading={isLoading}
      id={`group${level}-${groupFieldValue}`}
      onToggle={onToggle}
      paddingSize="m"
    >
      {renderChildComponent(groupFilters)}
    </EuiAccordion>
  );
};

export const GroupPanel = React.memo(GroupPanelComponent);

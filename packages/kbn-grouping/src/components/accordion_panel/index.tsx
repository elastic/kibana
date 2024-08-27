/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiAccordion, EuiFlexGroup, EuiFlexItem, EuiTitle, EuiIconTip } from '@elastic/eui';
import type { Filter } from '@kbn/es-query';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { GroupingBucket } from '../types';
import { createGroupFilter, getNullGroupFilter } from '../../containers/query/helpers';

interface GroupPanelProps<T> {
  customAccordionButtonClassName?: string;
  customAccordionClassName?: string;
  extraAction?: React.ReactNode;
  forceState?: 'open' | 'closed';
  groupBucket: GroupingBucket<T>;
  groupPanel?: JSX.Element;
  groupingLevel?: number;
  isLoading: boolean;
  isNullGroup?: boolean;
  nullGroupMessage?: string;
  onGroupClose: () => void;
  onToggleGroup?: (isOpen: boolean, groupBucket: GroupingBucket<T>) => void;
  renderChildComponent: (groupFilter: Filter[]) => React.ReactElement;
  selectedGroup: string;
}

const DefaultGroupPanelRenderer = ({
  isNullGroup,
  title,
  nullGroupMessage,
}: {
  isNullGroup: boolean;
  title: string;
  nullGroupMessage?: string;
}) => (
  <div>
    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false} className="eui-textTruncate">
        <EuiTitle size="xs">
          <h4 className="eui-textTruncate" title={title}>
            {title}
          </h4>
        </EuiTitle>
      </EuiFlexItem>
      {isNullGroup && nullGroupMessage && (
        <EuiFlexItem grow={false} data-test-subj="null-group-icon">
          <EuiIconTip content={nullGroupMessage} position="right" />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  </div>
);

const GroupPanelComponent = <T,>({
  customAccordionButtonClassName,
  customAccordionClassName = 'groupingAccordionForm',
  extraAction,
  forceState,
  groupBucket,
  groupPanel,
  groupingLevel = 0,
  isLoading,
  isNullGroup = false,
  onGroupClose,
  onToggleGroup,
  renderChildComponent,
  selectedGroup,
  nullGroupMessage,
}: GroupPanelProps<T>) => {
  const lastForceState = useRef(forceState);
  useEffect(() => {
    if (lastForceState.current === 'open' && forceState === 'closed') {
      // when parent group closes, reset pagination of any child groups
      onGroupClose();
      lastForceState.current = 'closed';
    } else if (lastForceState.current === 'closed' && forceState === 'open') {
      lastForceState.current = 'open';
    }
  }, [onGroupClose, forceState, selectedGroup]);
  const groupFieldValue = useMemo<{ asString: string | null; asArray: string[] | null }>(
    () =>
      groupBucket.selectedGroup === selectedGroup
        ? {
            asString: groupBucket.key_as_string,
            asArray: groupBucket.key,
          }
        : { asString: null, asArray: null },
    [groupBucket.key, groupBucket.key_as_string, groupBucket.selectedGroup, selectedGroup]
  );

  const groupFilters = useMemo(
    () =>
      isNullGroup
        ? getNullGroupFilter(selectedGroup)
        : createGroupFilter(selectedGroup, groupFieldValue.asArray),
    [groupFieldValue.asArray, isNullGroup, selectedGroup]
  );

  const onToggle = useCallback(
    (isOpen) => {
      if (onToggleGroup) {
        onToggleGroup(isOpen, groupBucket);
      }
    },
    [groupBucket, onToggleGroup]
  );

  return !groupFieldValue.asString ? null : (
    <EuiAccordion
      buttonClassName={customAccordionButtonClassName}
      buttonContent={
        <div data-test-subj="group-panel-toggle" className="groupingPanelRenderer">
          {groupPanel ?? (
            <DefaultGroupPanelRenderer
              title={groupFieldValue.asString}
              isNullGroup={isNullGroup}
              nullGroupMessage={nullGroupMessage}
            />
          )}
        </div>
      }
      buttonElement="div"
      className={groupingLevel > 0 ? 'groupingAccordionFormLevel' : customAccordionClassName}
      data-test-subj="grouping-accordion"
      extraAction={extraAction}
      forceState={forceState}
      isLoading={isLoading}
      id={`group${groupingLevel}-${groupFieldValue.asString}`}
      onToggle={onToggle}
      paddingSize="m"
    >
      <span data-test-subj="grouping-accordion-content">{renderChildComponent(groupFilters)}</span>
    </EuiAccordion>
  );
};

export const GroupPanel = React.memo(GroupPanelComponent);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiBadge,
  EuiWrappingPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  type EuiContextMenuItemProps,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { filterExpressionCodec } from '../../../../../utils/codec';
import { useProjectPickerState, useProjectPickerActions } from '../../../../../state';
import { filterDisplayStyles } from './filter_display.styles';

interface GetFilterBadgeContextMenuItemsProps {
  closePopover: () => void;
  onEditFilter: (filter: ReturnType<typeof filterExpressionCodec.encode>) => void;
  actions: ReturnType<typeof useProjectPickerActions>;
}

interface FilterBadgeClickActionContext {
  filter: string;
}

const getFilterBadgeContextMenuItems = ({
  onEditFilter,
  actions,
  closePopover,
}: GetFilterBadgeContextMenuItemsProps): Array<
  Pick<EuiContextMenuItemProps, 'icon' | 'onClick' | 'external' | 'disabled'> & { label: string }
> => {
  return [
    {
      icon: 'pencil',
      label: i18n.translate('projectPicker.filterDisplay.removeFilter', {
        defaultMessage: 'Edit',
      }),
      onClick(this: FilterBadgeClickActionContext, e) {
        e.preventDefault();
        onEditFilter(this.filter);
      },
    },
    {
      icon: 'filterExclude',
      label: i18n.translate('projectPicker.filterDisplay.removeFilter', {
        defaultMessage: 'Convert to exclusion',
      }),
      onClick(this: FilterBadgeClickActionContext, e) {
        e.preventDefault();
        // TODO: Implement
      },
    },
    {
      icon: 'eyeSlash',
      label: i18n.translate('projectPicker.filterDisplay.removeFilter', {
        defaultMessage: 'Disable',
      }),
      onClick(this: FilterBadgeClickActionContext, e) {
        e.preventDefault();
        // TODO: Implement
      },
    },
    {
      icon: 'cross',
      label: i18n.translate('projectPicker.filterDisplay.removeFilter', {
        defaultMessage: 'Remove',
      }),
      onClick(this: FilterBadgeClickActionContext, e) {
        e.preventDefault();
        actions.removeFilterExpression({ filterExpression: this.filter });
        closePopover();
      },
    },
  ];
};

export interface ProjectPickerFilterDisplayProps {
  onEditFilter: (filter: ReturnType<typeof filterExpressionCodec.encode>) => void;
}

export function ProjectPickerFilterDisplay({ onEditFilter }: ProjectPickerFilterDisplayProps) {
  const state = useProjectPickerState();
  const actions = useProjectPickerActions();
  const { euiTheme } = useEuiTheme();
  const styles = filterDisplayStyles({ euiTheme });
  const selectedFilterBadgeRef = useRef<HTMLButtonElement | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const closePopover = useCallback(() => {
    setSelectedFilter(null);
  }, []);

  const filterBadgeContextMenuItems = useMemo(() => {
    return getFilterBadgeContextMenuItems({ onEditFilter, actions, closePopover });
  }, [actions, onEditFilter, closePopover]);

  const renderFilterBadgeContextMenu = useCallback(() => {
    return selectedFilter ? (
      <EuiWrappingPopover
        button={selectedFilterBadgeRef.current!}
        isOpen={selectedFilter !== null}
        closePopover={closePopover}
        panelPaddingSize="none"
        aria-label={i18n.translate('projectPicker.filterDisplay.filterBadgeContextMenuAriaLabel', {
          defaultMessage: 'Filter actions for {filter}',
          values: { filter: selectedFilter },
        })}
      >
        <EuiContextMenuPanel
          items={filterBadgeContextMenuItems.map((contextMenuItemConfig) => (
            <EuiContextMenuItem
              key={contextMenuItemConfig.label}
              icon={contextMenuItemConfig.icon}
              onClick={contextMenuItemConfig.onClick?.bind({
                filter: selectedFilter,
              })}
            >
              {contextMenuItemConfig.label}
            </EuiContextMenuItem>
          ))}
        />
      </EuiWrappingPopover>
    ) : null;
  }, [closePopover, filterBadgeContextMenuItems, selectedFilter]);

  const handleFilterBadgeClick = useCallback(
    (filter: string, evt: React.MouseEvent<HTMLButtonElement>) => {
      setSelectedFilter(filter);
      selectedFilterBadgeRef.current = evt.currentTarget;
    },
    []
  );

  const handleFilterCreateClick = useCallback(() => {
    onEditFilter(null);
  }, [onEditFilter]);

  return (
    <>
      {renderFilterBadgeContextMenu()}
      <EuiFlexGroup direction="column" gutterSize="none" css={styles.container}>
        {state.filterExpression.length > 0 ? (
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="s">
              {state.filterExpression.map((filter) => (
                <EuiFlexItem key={filter} grow={false}>
                  <EuiBadge
                    color="hollow"
                    onClick={handleFilterBadgeClick.bind(null, filter)}
                    style={{ width: 'fit-content' }}
                    onClickAriaLabel={i18n.translate(
                      'projectPicker.filterDisplay.filterBadgeClickAriaLabel',
                      {
                        defaultMessage: 'Click to view filter actions',
                      }
                    )}
                  >
                    {filter}
                  </EuiBadge>
                </EuiFlexItem>
              ))}
            </EuiFlexGroup>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            css={styles.filterCreateButton}
            data-test-subj="projectPickerFilterDisplayAddFilterBtn"
            flush="both"
            onClick={handleFilterCreateClick}
          >
            <EuiText size="xs">
              {i18n.translate('projectPicker.filterDisplay.addFilterBtnText', {
                defaultMessage: 'Add project tag filter',
              })}
            </EuiText>
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
}

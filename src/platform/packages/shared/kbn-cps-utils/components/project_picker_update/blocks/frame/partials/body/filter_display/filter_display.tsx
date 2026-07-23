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
  EuiWrappingPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  type EuiContextMenuItemProps,
  useEuiTheme,
  EuiCallOut,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ProjectPickerState } from '../../../../../state/reducers';
import { getIncludedVisibleProjectIds } from '../../../../../state/derivatives';
import { useProjectPickerState, useProjectPickerActions } from '../../../../../state';
import { filterDisplayStyles } from './filter_display.styles';
import type { FilterExpressionValue } from '../../../../../utils/filter_input_codec';
import { isNegatedOperator } from '../../../../../utils/filter_input_codec';
import { FilterBadge } from '../../../../filter_badge';

/**
 * Describes a filter that is being edited in the filter form.
 */
export interface EditingFilter {
  id: string;
  expression: FilterExpressionValue;
  enabled: boolean;
}

interface GetFilterBadgeContextMenuItemsProps {
  closePopover: () => void;
  onEditFilter: (filter: Pick<EditingFilter, 'id' | 'expression'>) => void;
  actions: ReturnType<typeof useProjectPickerActions>;
}

interface FilterBadgeClickActionContext extends EditingFilter {
  projectPickerState: ProjectPickerState;
}

interface FilterBadgeContextMenuItemProps
  extends Pick<EuiContextMenuItemProps, 'icon' | 'onClick' | 'external'> {
  label: string;
  isDisabled?: (props: FilterBadgeClickActionContext) => boolean;
  isDisplayed?: (props: FilterBadgeClickActionContext) => boolean;
}

/**
 * Returns the context menu items for the filter badge.
 */
const getFilterBadgeContextMenuItems = ({
  onEditFilter,
  actions,
  closePopover,
}: GetFilterBadgeContextMenuItemsProps): Array<FilterBadgeContextMenuItemProps> => {
  return [
    {
      icon: 'pencil',
      label: i18n.translate('cpsUtils.projectPicker.filterDisplay.editFilter', {
        defaultMessage: 'Edit',
      }),
      isDisabled: ({ enabled }) => {
        return !enabled;
      },
      onClick(this: FilterBadgeClickActionContext, e) {
        e.preventDefault();
        onEditFilter({ id: this.id, expression: this.expression });
      },
    },
    {
      icon: 'filterExclude',
      label: i18n.translate('cpsUtils.projectPicker.filterDisplay.convertToExclusion', {
        defaultMessage: 'Convert to exclusion',
      }),
      onClick(this: FilterBadgeClickActionContext, e) {
        e.preventDefault();
        actions.invertFilterExpressionOperator({ filterId: this.id });
        closePopover();
      },
      isDisabled: ({ enabled }) => {
        return !enabled;
      },
      isDisplayed: ({ projectPickerState, id }) => {
        const filterExpression = projectPickerState.filterExpressions.get(id);
        if (!filterExpression) {
          return false;
        }

        const { operator } = filterExpression.expression;

        return !isNegatedOperator(operator);
      },
    },
    {
      icon: 'filterInclude',
      label: i18n.translate('cpsUtils.projectPicker.filterDisplay.convertToInclusion', {
        defaultMessage: 'Convert to inclusion',
      }),
      onClick(this: FilterBadgeClickActionContext, e) {
        e.preventDefault();
        actions.invertFilterExpressionOperator({ filterId: this.id });
        closePopover();
      },
      isDisabled: ({ enabled }) => {
        return !enabled;
      },
      isDisplayed: ({ projectPickerState, id }) => {
        const filterExpression = projectPickerState.filterExpressions.get(id);
        if (!filterExpression) {
          return false;
        }

        const { operator } = filterExpression.expression;

        return isNegatedOperator(operator);
      },
    },
    {
      icon: 'eyeSlash',
      label: i18n.translate('cpsUtils.projectPicker.filterDisplay.disableFilter', {
        defaultMessage: 'Disable',
      }),
      onClick(this: FilterBadgeClickActionContext, e) {
        e.preventDefault();
        actions.toggleFilterExpression({ filterId: this.id });
        closePopover();
      },
      isDisplayed: ({ projectPickerState, id }) => {
        return projectPickerState.filterExpressions.get(id)!.enabled;
      },
    },
    {
      icon: 'eye',
      label: i18n.translate('cpsUtils.projectPicker.filterDisplay.enableFilter', {
        defaultMessage: 'Enable',
      }),
      onClick(this: FilterBadgeClickActionContext, e) {
        e.preventDefault();
        actions.toggleFilterExpression({ filterId: this.id });
        closePopover();
      },
      isDisplayed: ({ projectPickerState, id }) => {
        return projectPickerState.filterExpressions.get(id)!.enabled === false;
      },
    },
    {
      icon: 'cross',
      label: i18n.translate('cpsUtils.projectPicker.filterDisplay.removeFilter', {
        defaultMessage: 'Remove',
      }),
      onClick(this: FilterBadgeClickActionContext, e) {
        e.preventDefault();
        actions.removeFilterExpression({ filterId: this.id });
        closePopover();
      },
    },
  ];
};

export interface ProjectPickerFilterDisplayProps {
  onEditFilter: (filter: Pick<EditingFilter, 'id' | 'expression'> | null) => void;
}

export function ProjectPickerFilterDisplay({ onEditFilter }: ProjectPickerFilterDisplayProps) {
  const state = useProjectPickerState();
  const actions = useProjectPickerActions();
  const { euiTheme } = useEuiTheme();
  const styles = filterDisplayStyles({ euiTheme });
  const selectedFilterBadgeRef = useRef<HTMLButtonElement | null>(null);
  const [selectedFilterId, setSelectedFilterId] = useState<string | null>(null);
  const closePopover = useCallback(() => {
    setSelectedFilterId(null);
  }, []);

  const filterEntries = useMemo(
    () => Array.from(state.filterExpressions.entries()),
    [state.filterExpressions]
  );

  const hasNoIncludedProjects = getIncludedVisibleProjectIds(state).length === 0;

  const selectedFilter = useMemo(() => {
    if (!selectedFilterId) {
      return null;
    }

    const entry = state.filterExpressions.get(selectedFilterId);
    if (!entry) {
      return null;
    }

    return { id: selectedFilterId, ...entry };
  }, [selectedFilterId, state.filterExpressions]);

  const filterBadgeContextMenuItems = useMemo(() => {
    return getFilterBadgeContextMenuItems({ onEditFilter, actions, closePopover });
  }, [actions, onEditFilter, closePopover]);

  const renderFilterBadgeContextMenu = useCallback(() => {
    return selectedFilter ? (
      <EuiWrappingPopover
        button={selectedFilterBadgeRef.current!}
        isOpen={selectedFilterId !== null}
        closePopover={closePopover}
        panelPaddingSize="none"
        aria-label={i18n.translate(
          'cpsUtils.projectPicker.filterDisplay.filterBadgeContextMenuAriaLabel',
          {
            defaultMessage: 'Filter actions',
          }
        )}
      >
        <EuiContextMenuPanel
          items={filterBadgeContextMenuItems
            .map((contextMenuItemConfig) => {
              const ctx = {
                ...selectedFilter,
                projectPickerState: state,
              };

              const isDisplayed = contextMenuItemConfig.isDisplayed?.(ctx) ?? true;

              return isDisplayed ? (
                <EuiContextMenuItem
                  key={contextMenuItemConfig.label}
                  icon={contextMenuItemConfig.icon}
                  onClick={contextMenuItemConfig.onClick?.bind({
                    id: selectedFilter.id,
                    expression: selectedFilter.expression,
                  })}
                  disabled={contextMenuItemConfig?.isDisabled?.(ctx) ?? false}
                >
                  {contextMenuItemConfig.label}
                </EuiContextMenuItem>
              ) : null;
            })
            .filter((item): item is React.ReactElement => item != null)}
        />
      </EuiWrappingPopover>
    ) : null;
  }, [closePopover, filterBadgeContextMenuItems, selectedFilter, selectedFilterId, state]);

  const handleFilterBadgeClick = useCallback(
    (filterId: string, evt: React.MouseEvent<HTMLButtonElement>) => {
      setSelectedFilterId(filterId);
      selectedFilterBadgeRef.current = evt.currentTarget;
    },
    []
  );

  const handleFilterBadgeIconClick = useCallback(
    (filterId: string, evt: React.MouseEvent<HTMLButtonElement>) => {
      evt.preventDefault();
      actions.removeFilterExpression({ filterId });
    },
    [actions]
  );

  const handleFilterCreateClick = useCallback(() => {
    onEditFilter(null);
  }, [onEditFilter]);

  return (
    <EuiFlexGroup direction="column" gutterSize="none">
      {hasNoIncludedProjects && Boolean(filterEntries.length) && (
        <EuiFlexItem>
          <EuiCallOut
            announceOnMount
            title={i18n.translate('cpsUtils.projectPicker.filterBox.noMatch.calloutTitle', {
              defaultMessage: 'No projects are currently being searched',
            })}
            color="warning"
            data-test-subj="projectPickerFilterDisplayNoMatchCallout"
          >
            <p>
              {i18n.translate('cpsUtils.projectPicker.filterBox.noMatch.calloutDescription', {
                defaultMessage:
                  'Adjust your project filters and toggles to ensure at least one project is included in your search.',
              })}
            </p>
          </EuiCallOut>
        </EuiFlexItem>
      )}
      <EuiFlexItem data-test-subj="projectPickerFilterDisplayContainer">
        {renderFilterBadgeContextMenu()}
        <EuiFlexGroup direction="column" gutterSize="none" css={styles.container}>
          {filterEntries.length > 0 ? (
            <EuiFlexItem css={styles.filterBadgesContainer}>
              <EuiFlexGroup gutterSize="s" responsive={false}>
                {filterEntries.map(([id, entry]) => (
                  <EuiFlexItem key={id} grow={false}>
                    <FilterBadge
                      filter={entry.expression}
                      onClick={handleFilterBadgeClick.bind(null, id)}
                      style={{
                        width: 'fit-content',
                        opacity: entry.enabled ? 1 : 0.5,
                      }}
                      onClickAriaLabel={i18n.translate(
                        'cpsUtils.projectPicker.filterDisplay.filterBadgeClickAriaLabel',
                        {
                          defaultMessage: 'Click to view filter actions',
                        }
                      )}
                      iconOnClick={handleFilterBadgeIconClick.bind(null, id)}
                      iconOnClickAriaLabel={i18n.translate(
                        'cpsUtils.projectPicker.filterDisplay.filterBadgeIconClickAriaLabel',
                        {
                          defaultMessage: 'Click to remove filter',
                        }
                      )}
                      iconSide="right"
                      iconType="cross"
                    />
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
                {i18n.translate('cpsUtils.projectPicker.filterDisplay.addFilterBtnText', {
                  defaultMessage: 'Add project tag filter',
                })}
              </EuiText>
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
  type EuiContextMenuItemProps,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useCallback, useState } from 'react';
import type { ProjectPickerState } from '../../../../state/reducers';
import { useProjectPickerActions, useProjectPickerState } from '../../../../state';

interface HeaderContextMenuClickActionContext {
  state: ProjectPickerState;
}
interface HeaderContextMenuItemProps
  extends Pick<EuiContextMenuItemProps, 'icon' | 'onClick' | 'external' | 'disabled'> {
  label: string;
  isDisabled?: (props: HeaderContextMenuClickActionContext) => boolean;
}

const getContextMenuItems = (
  actions: ReturnType<typeof useProjectPickerActions>
): Array<HeaderContextMenuItemProps>[] => [
  [
    {
      icon: 'eraser',
      label: i18n.translate('cpsUtils.projectPicker.frameHeader.clearProjectFilters', {
        defaultMessage: 'Clear project tag filters',
      }),
      onClick: () => {
        actions.clearProjectFilters();
      },
      isDisabled: ({ state }) => {
        return state.filterExpressions.size === 0 || Boolean(state.isReadOnly);
      },
    },
    {
      icon: 'clockCounter',
      label: i18n.translate('cpsUtils.projectPicker.frameHeader.revertToSpaceDefaults', {
        defaultMessage: 'Revert to space defaults',
      }),
      onClick: () => {
        actions.revertToSpaceDefaults();
      },
      isDisabled: ({ state }) => {
        return (
          (state.filterExpressions.size === 0 && state.excludedOverrides.length === 0) ||
          Boolean(state.isReadOnly)
        );
      },
    },
  ],
  [
    {
      icon: 'controls',
      label: i18n.translate('cpsUtils.projectPicker.frameHeader.adjustSpaceDefaultsAction', {
        defaultMessage: 'Adjust space defaults',
      }),
    },
    {
      icon: 'gear',
      label: i18n.translate('cpsUtils.projectPicker.frameHeader.manageCrossProjectSearch', {
        defaultMessage: 'Manage cross-project search',
      }),
      external: true,
    },
  ],
];

export function ProjectPickerFrameHeader() {
  const [isOpen, setIsOpen] = useState(false);
  const actions = useProjectPickerActions();
  const state = useProjectPickerState();
  const contextMenuTooltipId = useGeneratedHtmlId();

  // TODO: this definition of space defaults is not correct but suffices for now,
  // it should be based on the space defaults set in the space picker
  const isUsingSpaceDefaults = useMemo(
    () => state.filterExpressions.size === 0 && state.excludedOverrides.length === 0,
    [state.filterExpressions, state.excludedOverrides]
  );

  const closePopover = useCallback(() => setIsOpen(false), []);
  const contextMenuConfig = useMemo(() => getContextMenuItems(actions), [actions]);

  return (
    <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
      <EuiFlexItem grow>
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('cpsUtils.projectPicker.frameHeader.title', {
              defaultMessage: 'Cross-project search',
            })}
          </h3>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup responsive={false}>
          {isUsingSpaceDefaults && (
            <EuiFlexItem>
              <EuiBadge color="primary">
                {i18n.translate('cpsUtils.projectPicker.frameHeader.usingSpaceDefaultsBadge', {
                  defaultMessage: 'Using space defaults',
                })}
              </EuiBadge>
            </EuiFlexItem>
          )}
          <EuiFlexItem>
            <EuiPopover
              panelPaddingSize="none"
              aria-labelledby={contextMenuTooltipId}
              button={
                <EuiToolTip
                  id={contextMenuTooltipId}
                  content={i18n.translate('cpsUtils.projectPicker.frameHeader.addProjectTooltip', {
                    defaultMessage: 'Global actions',
                  })}
                >
                  <EuiButtonIcon
                    aria-labelledby={contextMenuTooltipId}
                    iconType="ellipsis"
                    onClick={() => setIsOpen(true)}
                    color="text"
                  />
                </EuiToolTip>
              }
              isOpen={isOpen}
              closePopover={closePopover}
            >
              <EuiContextMenuPanel
                items={contextMenuConfig.reduce((acc, section, index) => {
                  acc = acc.concat(
                    section.map((item) => (
                      <EuiContextMenuItem
                        key={item.label}
                        icon={item.icon}
                        onClick={item.onClick}
                        disabled={item.isDisabled?.({ state }) ?? false}
                      >
                        {item.label}
                      </EuiContextMenuItem>
                    ))
                  );

                  if (index < contextMenuConfig.length - 1) {
                    acc.push(<EuiHorizontalRule key={`separator-${index}`} margin="xs" />);
                  }

                  return acc;
                }, [] as React.ReactElement[])}
              />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

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
export interface HeaderContextMenuItemProps
  extends Pick<EuiContextMenuItemProps, 'icon' | 'onClick' | 'href' | 'external' | 'disabled'> {
  label: string;
  testSubj: string;
  isDisabled?: (props: HeaderContextMenuClickActionContext) => boolean;
}

const getContextMenuItems = (
  actions: ReturnType<typeof useProjectPickerActions>
): HeaderContextMenuItemProps[] => [
  {
    icon: 'eraser',
    label: i18n.translate('cpsUtils.projectPicker.frameHeader.clearProjectFilters', {
      defaultMessage: 'Clear project tag filters',
    }),
    testSubj: 'projectPickerClearFiltersMenuItem',
    onClick: () => {
      actions.clearProjectFilters();
    },
    isDisabled: ({ state }) => {
      return (
        state.displayedFilterExpressions.size === 0 ||
        state.isFilterProposalPending ||
        Boolean(state.controlsState === 'disabled')
      );
    },
  },
  {
    icon: 'clockCounter',
    label: i18n.translate('cpsUtils.projectPicker.frameHeader.revertToSpaceDefaults', {
      defaultMessage: 'Revert to space defaults',
    }),
    testSubj: 'projectPickerRevertToSpaceDefaultsMenuItem',
    onClick: () => {
      actions.revertToSpaceDefaults();
    },
    isDisabled: ({ state }) => {
      return (
        state.isUsingSpaceDefaults ||
        state.isFilterProposalPending ||
        Boolean(state.controlsState === 'disabled')
      );
    },
  },
];

export interface ProjectPickerFrameHeaderActionsProps {
  customContextMenuItems?: HeaderContextMenuItemProps[];
}

export function ProjectPickerFrameHeaderActions({
  customContextMenuItems,
}: ProjectPickerFrameHeaderActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const actions = useProjectPickerActions();
  const state = useProjectPickerState();
  const contextMenuTooltipId = useGeneratedHtmlId();

  const closePopover = useCallback(() => setIsOpen(false), []);

  const contextMenuConfig = useMemo<Array<HeaderContextMenuItemProps[]>>(
    () =>
      [getContextMenuItems(actions), customContextMenuItems].filter(
        (contextMenuItems): contextMenuItems is HeaderContextMenuItemProps[] =>
          Boolean(contextMenuItems)
      ),
    [actions, customContextMenuItems]
  );

  if (state.controlsState === 'hidden') {
    return null;
  }

  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup responsive={false} alignItems="center">
        {state.isUsingSpaceDefaults && (
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
                  data-test-subj="projectPickerGlobalActionsButton"
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
                      href={item.href}
                      external={item.external}
                      data-test-subj={item.testSubj}
                      onClick={(event) => {
                        item.onClick?.(event);
                        closePopover();
                      }}
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
  );
}

interface ProjectPickerFrameHeaderProps extends ProjectPickerFrameHeaderActionsProps {
  customHeaderText?: React.ReactNode;
}

export function ProjectPickerFrameHeader({
  customContextMenuItems,
  customHeaderText,
}: ProjectPickerFrameHeaderProps) {
  return (
    <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
      <EuiFlexItem grow>
        {customHeaderText ?? (
          <EuiTitle size="xxs">
            <h3>
              {i18n.translate('cpsUtils.projectPicker.frameHeader.title', {
                defaultMessage: 'Change project scope',
              })}
            </h3>
          </EuiTitle>
        )}
      </EuiFlexItem>
      <ProjectPickerFrameHeaderActions customContextMenuItems={customContextMenuItems} />
    </EuiFlexGroup>
  );
}

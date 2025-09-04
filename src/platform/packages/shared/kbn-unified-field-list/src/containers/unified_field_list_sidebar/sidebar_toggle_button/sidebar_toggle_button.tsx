/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { IconButtonGroup, type IconButtonGroupProps } from '@kbn/shared-ux-button-toolbar';
import { useRestorableRef } from '../../../restorable_state';

/**
 * Toggle button props
 */
export interface SidebarToggleButtonProps {
  'data-test-subj'?: string;
  isSidebarCollapsed: boolean;
  panelId?: string;
  buttonSize: IconButtonGroupProps['buttonSize'];
  onChange: (isSidebarCollapsed: boolean) => void;
}

/**
 * A toggle button for the fields sidebar
 * @param data-test-subj
 * @param isSidebarCollapsed
 * @param panelId
 * @param onChange
 * @constructor
 */
export const SidebarToggleButton: React.FC<SidebarToggleButtonProps> = ({
  'data-test-subj': dataTestSubj = 'unifiedFieldListSidebar__toggle',
  isSidebarCollapsed,
  panelId,
  buttonSize,
  onChange,
}) => {
  const isSidebarCollapsedRef = useRestorableRef('isCollapsed', isSidebarCollapsed, {
    shouldStoreDefaultValueRightAway: true, // otherwise, it would re-initialize with the localStorage value which might
  });

  useEffect(() => {
    isSidebarCollapsedRef.current = isSidebarCollapsed;
  }, [isSidebarCollapsed, isSidebarCollapsedRef]);

  return (
    <div data-test-subj={dataTestSubj}>
      <IconButtonGroup
        legend={i18n.translate('unifiedFieldList.fieldListSidebar.toggleSidebarLegend', {
          defaultMessage: 'Toggle sidebar',
        })}
        buttonSize={buttonSize}
        buttons={[
          ...(isSidebarCollapsed
            ? [
                {
                  label: i18n.translate('unifiedFieldList.fieldListSidebar.expandSidebarButton', {
                    defaultMessage: 'Show sidebar',
                  }),
                  iconType: 'transitionLeftIn',
                  'data-test-subj': `${dataTestSubj}-expand`,
                  'aria-expanded': false,
                  'aria-controls': panelId,
                  onClick: () => onChange(false),
                },
              ]
            : [
                {
                  label: i18n.translate('unifiedFieldList.fieldListSidebar.collapseSidebarButton', {
                    defaultMessage: 'Hide sidebar',
                  }),
                  iconType: 'transitionLeftOut',
                  'data-test-subj': `${dataTestSubj}-collapse`,
                  'aria-expanded': true,
                  'aria-controls': panelId,
                  onClick: () => onChange(true),
                },
              ]),
        ]}
      />
    </div>
  );
};

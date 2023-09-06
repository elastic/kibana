/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { IconButtonGroup } from '@kbn/shared-ux-button-toolbar';

// TODO: replace with new Eui icons once available and remove svgs
import iconCollapse from './sidebar_icon_collapse.svg';
import iconExpand from './sidebar_icon_expand.svg';

/**
 * Toggle button props
 */
export interface SidebarToggleButtonProps {
  'data-test-subj'?: string;
  isSidebarCollapsed: boolean;
  onChange: (isSidebarCollapsed: boolean) => void;
}

/**
 * A toggle button for the fields sidebar
 * @param data-test-subj
 * @param isSidebarCollapsed
 * @param onChange
 * @constructor
 */
export const SidebarToggleButton: React.FC<SidebarToggleButtonProps> = ({
  'data-test-subj': dataTestSubj,
  isSidebarCollapsed,
  onChange,
}) => {
  return (
    <IconButtonGroup
      data-test-subj={dataTestSubj}
      legend={i18n.translate('unifiedFieldList.fieldListSidebar.toggleSidebarLegend', {
        defaultMessage: 'Toggle sidebar',
      })}
      buttonSize="s"
      buttons={[
        ...(isSidebarCollapsed
          ? [
              {
                label: i18n.translate('unifiedFieldList.fieldListSidebar.expandSidebarButton', {
                  defaultMessage: 'Show sidebar',
                }),
                iconType: iconExpand,
                onClick: () => onChange(false),
              },
            ]
          : [
              {
                label: i18n.translate('unifiedFieldList.fieldListSidebar.collapseSidebarButton', {
                  defaultMessage: 'Hide sidebar',
                }),
                iconType: iconCollapse,
                onClick: () => onChange(true),
              },
            ]),
      ]}
    />
  );
};

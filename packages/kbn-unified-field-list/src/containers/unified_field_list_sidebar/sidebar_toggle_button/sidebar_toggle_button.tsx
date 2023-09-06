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
  'data-test-subj': dataTestSubj = 'unifiedFieldListSidebar__toggle',
  isSidebarCollapsed,
  onChange,
}) => {
  // TODO: replace with new Eui icons once available and remove svgs
  return (
    <div data-test-subj={dataTestSubj}>
      <IconButtonGroup
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
                  iconType: IconExpand,
                  'data-test-subj': `${dataTestSubj}-expand`,
                  onClick: () => onChange(false),
                },
              ]
            : [
                {
                  label: i18n.translate('unifiedFieldList.fieldListSidebar.collapseSidebarButton', {
                    defaultMessage: 'Hide sidebar',
                  }),
                  iconType: IconCollapse,
                  'data-test-subj': `${dataTestSubj}-collapse`,
                  onClick: () => onChange(true),
                },
              ]),
        ]}
      />
    </div>
  );
};

const IconExpand = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M10.1464 5.85355C9.95118 5.65829 9.95118 5.34171 10.1464 5.14645C10.3417 4.95118 10.6583 4.95118 10.8536 5.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L10.8536 9.85355C10.6583 10.0488 10.3417 10.0488 10.1464 9.85355C9.95118 9.65829 9.95118 9.34171 10.1464 9.14645L11.2929 8H7.5C7.22386 8 7 7.77614 7 7.5C7 7.22386 7.22386 7 7.5 7H11.2929L10.1464 5.85355Z"
      fill="currentColor"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2 0H13C14.1046 0 15 0.895431 15 2V13C15 14.1046 14.1046 15 13 15H2C0.89543 15 0 14.1046 0 13V2C0 0.89543 0.895431 0 2 0ZM3 1H5V2H4V3H3V4H2V5H1V3H2V2H3V1ZM2 2L1 2C1 1.44772 1.44772 1 2 1V2ZM2 8H1V6H2V5H3V4H4V3H5V5H4V6H3V7H2V8ZM2 11H1V9H2V8H3V7H4V6H5V8H4V9H3V10H2V11ZM3 13H2L2 14C1.44772 14 1 13.5523 1 13V12H2V11H3V10H4V9H5V11H4V12H3V13ZM3 13H4V12H5V14H3V13ZM6 1H13C13.5523 1 14 1.44772 14 2V13C14 13.5523 13.5523 14 13 14H6V1Z"
      fill="currentColor"
    />
  </svg>
);

const IconCollapse = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M9.85355 5.85355C10.0488 5.65829 10.0488 5.34171 9.85355 5.14645C9.65829 4.95118 9.34171 4.95118 9.14645 5.14645L7.14645 7.14645C6.95118 7.34171 6.95118 7.65829 7.14645 7.85355L9.14645 9.85355C9.34171 10.0488 9.65829 10.0488 9.85355 9.85355C10.0488 9.65829 10.0488 9.34171 9.85355 9.14645L8.70711 8H12.5C12.7761 8 13 7.77614 13 7.5C13 7.22386 12.7761 7 12.5 7H8.70711L9.85355 5.85355Z"
      fill="currentColor"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M2 0H13C14.1046 0 15 0.895431 15 2V13C15 14.1046 14.1046 15 13 15H2C0.89543 15 0 14.1046 0 13V2C0 0.89543 0.895431 0 2 0ZM3 1H5V2H4V3H3V4H2V5H1V3H2V2H3V1ZM2 2L1 2C1 1.44772 1.44772 1 2 1V2ZM2 8H1V6H2V5H3V4H4V3H5V5H4V6H3V7H2V8ZM2 11H1V9H2V8H3V7H4V6H5V8H4V9H3V10H2V11ZM3 13H2L2 14C1.44772 14 1 13.5523 1 13V12H2V11H3V10H4V9H5V11H4V12H3V13ZM3 13H4V12H5V14H3V13ZM6 1H13C13.5523 1 14 1.44772 14 2V13C14 13.5523 13.5523 14 13 14H6V1Z"
      fill="currentColor"
    />
  </svg>
);

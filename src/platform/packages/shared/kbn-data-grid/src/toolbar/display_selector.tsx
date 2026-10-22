/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import type { ReactNode } from 'react';
import {
  EuiButtonGroup,
  EuiFormRow,
  EuiPopover,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DataGridDensity } from '../types';
import { ToolbarIconButton } from './toolbar_control_button';

interface DisplaySelectorProps {
  density: DataGridDensity;
  /** Without it the density cannot be changed. */
  onChangeDensity?: (density: DataGridDensity) => void;
  /** Rendered in the popover next to the density, e.g. more display settings. */
  renderCustomContent?: (params: { densityControl: ReactNode }) => ReactNode;
}

const getDensityOptions = () => [
  {
    id: 'compact',
    label: i18n.translate('kbnDataGrid.toolbar.densityCompact', { defaultMessage: 'Compact' }),
  },
  {
    id: 'normal',
    label: i18n.translate('kbnDataGrid.toolbar.densityNormal', { defaultMessage: 'Normal' }),
  },
  {
    id: 'expanded',
    label: i18n.translate('kbnDataGrid.toolbar.densityExpanded', { defaultMessage: 'Expanded' }),
  },
];

export const DisplaySelector = ({
  density,
  onChangeDensity,
  renderCustomContent,
}: DisplaySelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const densityLabel = i18n.translate('kbnDataGrid.toolbar.density', { defaultMessage: 'Density' });
  const legendId = useGeneratedHtmlId();
  const euiThemeContext = useEuiTheme();
  // Wide enough for the form rows (the max width of a form, 400px), like in EuiDataGrid.
  const popoverWidth = `calc(400px + ${euiThemeContext.euiTheme.size.s} * 2)`;

  const densityControl = onChangeDensity ? (
    <EuiFormRow label={densityLabel} display="columnCompressed">
      <EuiButtonGroup
        legend={densityLabel}
        data-test-subj="densityButtonGroup"
        buttonSize="s"
        isFullWidth
        options={getDensityOptions()}
        idSelected={density}
        onChange={(id) => onChangeDensity(id as DataGridDensity)}
      />
    </EuiFormRow>
  ) : null;

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="s"
      panelProps={{ css: { inlineSize: popoverWidth } }}
      panelClassName="euiDataGrid__displayPopoverPanel"
      aria-labelledby={legendId}
      button={
        <ToolbarIconButton
          id={legendId}
          iconType="controls"
          data-test-subj="dataGridDisplaySelectorButton"
          aria-label={i18n.translate('kbnDataGrid.toolbar.displayOptions', {
            defaultMessage: 'Display options',
          })}
          onClick={() => setIsOpen((open) => !open)}
        />
      }
    >
      {renderCustomContent ? renderCustomContent({ densityControl }) : densityControl}
    </EuiPopover>
  );
};

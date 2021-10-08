/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import useMount from 'react-use/lib/useMount';
import React, { useState } from 'react';
import {
  EuiFlyoutHeader,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiFlyoutBody,
  EuiFormRow,
  EuiSpacer,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';

import { ControlsPanels } from '../types';
import { ControlStyle, ControlWidth } from '../../types';
import { ControlGroupStrings } from '../control_group_strings';
import { CONTROL_LAYOUT_OPTIONS, CONTROL_WIDTH_OPTIONS } from '../control_group_constants';

interface ManageControlGroupProps {
  panels: ControlsPanels;
  controlStyle: ControlStyle;
  deleteAllEmbeddables: () => void;
  setControlStyle: (style: ControlStyle) => void;
  setAllPanelWidths: (newWidth: ControlWidth) => void;
}

export const ManageControlGroup = ({
  panels,
  controlStyle,
  setControlStyle,
  setAllPanelWidths,
  deleteAllEmbeddables,
}: ManageControlGroupProps) => {
  const [currentControlStyle, setCurrentControlStyle] = useState<ControlStyle>(controlStyle);
  const [selectedWidth, setSelectedWidth] = useState<ControlWidth>();
  const [selectionDisplay, setSelectionDisplay] = useState(false);

  useMount(() => {
    if (!panels || Object.keys(panels).length === 0) return;
    const firstWidth = panels[Object.keys(panels)[0]].width;
    if (Object.values(panels).every((panel) => panel.width === firstWidth)) {
      setSelectedWidth(firstWidth);
    }
  });

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>{ControlGroupStrings.management.getFlyoutTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow label={ControlGroupStrings.management.getLayoutTitle()}>
          <EuiButtonGroup
            color="primary"
            legend={ControlGroupStrings.management.controlStyle.getDesignSwitchLegend()}
            options={CONTROL_LAYOUT_OPTIONS}
            idSelected={currentControlStyle}
            onChange={(newControlStyle) => {
              setControlStyle(newControlStyle as ControlStyle);
              setCurrentControlStyle(newControlStyle as ControlStyle);
            }}
          />
        </EuiFormRow>
        <EuiSpacer size="m" />
        <EuiFormRow label={ControlGroupStrings.management.getWidthTitle()}>
          <EuiSwitch
            label={ControlGroupStrings.management.controlWidth.getChangeAllControlWidthsTitle()}
            checked={selectionDisplay}
            onChange={() => setSelectionDisplay(!selectionDisplay)}
          />
        </EuiFormRow>
        {selectionDisplay ? (
          <>
            <EuiSpacer size="s" />
            <EuiButtonGroup
              color="primary"
              idSelected={selectedWidth ?? ''}
              legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
              options={CONTROL_WIDTH_OPTIONS}
              onChange={(newWidth: string) => {
                setAllPanelWidths(newWidth as ControlWidth);
                setSelectedWidth(newWidth as ControlWidth);
              }}
            />
          </>
        ) : undefined}

        <EuiSpacer size="xl" />

        <EuiButtonEmpty
          onClick={deleteAllEmbeddables}
          aria-label={'delete-all'}
          iconType="trash"
          color="danger"
          flush="left"
          size="s"
        >
          {ControlGroupStrings.management.getDeleteAllButtonTitle()}
        </EuiButtonEmpty>
      </EuiFlyoutBody>
    </>
  );
};

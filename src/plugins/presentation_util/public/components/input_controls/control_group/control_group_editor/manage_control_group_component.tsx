/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiButtonEmpty,
  EuiDragDropContext,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDroppable,
  EuiDraggable,
  euiDragDropReorder,
  DropResult,
  EuiIcon,
  EuiButtonGroup,
  EuiFormLabel,
  EuiPanel,
  EuiButtonIcon,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiTitle,
  EuiFlyoutBody,
  EuiSpacer,
} from '@elastic/eui';
import { ControlGroupStrings } from '../control_group_strings';

type ControlWidth = 'auto' | 'small' | 'medium' | 'large';
export type ControlStyle = 'twoLine' | 'oneLine';

const widthOptions = [
  {
    id: `auto`,
    label: ControlGroupStrings.management.controlWidth.getAutoWidthTitle(),
  },
  {
    id: `small`,
    label: ControlGroupStrings.management.controlWidth.getSmallWidthTitle(),
  },
  {
    id: `medium`,
    label: ControlGroupStrings.management.controlWidth.getMediumWidthTitle(),
  },
  {
    id: `large`,
    label: ControlGroupStrings.management.controlWidth.getLargeWidthTitle(),
  },
];

export interface InputControlMeta {
  embeddableId: string;
  width: ControlWidth;
  title: string;
}

interface ManageControlGroupProps {
  controlMeta: InputControlMeta[];
  setControlMeta: React.Dispatch<React.SetStateAction<InputControlMeta[]>>;
  controlStyle: ControlStyle;
  setControlStyle: React.Dispatch<React.SetStateAction<ControlStyle>>;
}

export const ManageControlGroupComponent = ({
  controlMeta,
  setControlMeta,
  controlStyle,
  setControlStyle,
}: ManageControlGroupProps) => {
  const [isManagementFlyoutVisible, setIsManagementFlyoutVisible] = useState(false);

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (source && destination) {
      setControlMeta(euiDragDropReorder(controlMeta, source.index, destination.index));
    }
  };

  const manageControlsButton = (
    <EuiButtonEmpty
      size="xs"
      iconType="sortable"
      color="text"
      data-test-subj="inputControlsSortingButton"
      onClick={() => setIsManagementFlyoutVisible(!isManagementFlyoutVisible)}
    >
      {ControlGroupStrings.management.getManageButtonTitle()}
    </EuiButtonEmpty>
  );

  const ManageInputControlLineItem = ({
    currentControlMeta,
    dragHandleProps,
    index,
  }: {
    currentControlMeta: InputControlMeta;
    dragHandleProps: any;
    index: number;
  }) => {
    const { title, width } = currentControlMeta;
    return (
      <EuiFlexGroup alignItems="center" gutterSize="m">
        <EuiFlexItem grow={false}>
          <div {...dragHandleProps} aria-label={`drag-handle${title}`}>
            <EuiIcon type="grab" />
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormLabel>{title}</EuiFormLabel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            buttonSize="compressed"
            legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
            options={widthOptions}
            idSelected={width}
            onChange={(newWidth) =>
              setControlMeta((currentControls) => {
                currentControls[index].width = newWidth as ControlWidth;
                return [...currentControls];
              })
            }
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon iconType="trash" color="danger" aria-label={`delete-${title}`} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const manageControlGroupFlyout = (
    <EuiFlyout
      ownFocus
      onClose={() => setIsManagementFlyoutVisible(false)}
      aria-labelledby="flyoutTitle"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">{ControlGroupStrings.management.getFlyoutTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiTitle size="s">
          <h3>{ControlGroupStrings.management.getDesignTitle()}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiButtonGroup
          legend={ControlGroupStrings.management.controlStyle.getDesignSwitchLegend()}
          options={[
            {
              id: `oneLine`,
              label: ControlGroupStrings.management.controlStyle.getSingleLineTitle(),
            },
            {
              id: `twoLine`,
              label: ControlGroupStrings.management.controlStyle.getTwoLineTitle(),
            },
          ]}
          idSelected={controlStyle}
          onChange={(newControlStyle) => setControlStyle(newControlStyle as ControlStyle)}
        />
        <EuiSpacer size="m" />
        <EuiTitle size="s">
          <h3>{ControlGroupStrings.management.getLayoutTitle()}</h3>
        </EuiTitle>
        <EuiSpacer size="s" />

        <EuiFlexGroup alignItems="center" justifyContent="flexEnd">
          <EuiFlexItem grow={false}>
            <EuiFormLabel>
              {ControlGroupStrings.management.controlWidth.getChangeAllControlWidthsTitle()}
            </EuiFormLabel>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonGroup
              buttonSize="compressed"
              idSelected={
                controlMeta.every((currentMeta) => currentMeta?.width === controlMeta[0]?.width)
                  ? controlMeta[0]?.width
                  : ''
              }
              legend={ControlGroupStrings.management.controlWidth.getWidthSwitchLegend()}
              options={widthOptions}
              onChange={(newWidth) =>
                setControlMeta((currentControls) => {
                  currentControls.forEach((currentMeta) => {
                    currentMeta.width = newWidth as ControlWidth;
                  });
                  return [...currentControls];
                })
              }
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="trash" color="danger" aria-label={'delete-all'} size="s">
              {ControlGroupStrings.management.getDeleteAllButtonTitle()}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiDragDropContext onDragEnd={onDragEnd}>
          <EuiDroppable droppableId="CUSTOM_HANDLE_DROPPABLE_AREA" spacing="s">
            {controlMeta.map((currentControlMeta, index) => (
              <EuiDraggable
                spacing="m"
                index={index}
                customDragHandle={true}
                key={currentControlMeta.embeddableId}
                draggableId={currentControlMeta.embeddableId}
              >
                {(provided, state) => (
                  <EuiPanel
                    paddingSize="s"
                    className={`controlGroup--sortItem  ${
                      state.isDragging && 'controlGroup--sortItem-isDragging'
                    }`}
                  >
                    <ManageInputControlLineItem
                      index={index}
                      currentControlMeta={currentControlMeta}
                      dragHandleProps={provided.dragHandleProps}
                    />
                  </EuiPanel>
                )}
              </EuiDraggable>
            ))}
          </EuiDroppable>
        </EuiDragDropContext>
      </EuiFlyoutBody>
    </EuiFlyout>
  );

  return (
    <>
      {manageControlsButton}
      {isManagementFlyoutVisible && manageControlGroupFlyout}
    </>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState } from 'react';
import {
  EuiPopover,
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
} from '@elastic/eui';

const widthButtons: Array<{ id: ControlWidth; label: string }> = [
  {
    id: `auto`,
    label: 'Auto',
  },
  {
    id: `small`,
    label: 'Small',
  },
  {
    id: `medium`,
    label: 'Medium',
  },
  {
    id: `large`,
    label: 'Large',
  },
];

type ControlWidth = 'auto' | 'small' | 'medium' | 'large';

export interface InputControlMeta {
  embeddableId: string;
  width: ControlWidth;
  title: string;
}

interface ManageControlGroupProps {
  controlMeta: InputControlMeta[];
  setControlMeta: React.Dispatch<React.SetStateAction<InputControlMeta[]>>;
}

export const ManageControlGroupComponent = ({
  controlMeta,
  setControlMeta,
}: ManageControlGroupProps) => {
  const [isManagementPopoverOpen, setIsManagementPopoverOpen] = useState(false);

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
      onClick={() => setIsManagementPopoverOpen(!isManagementPopoverOpen)}
    >
      Manage Controls
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
        <EuiFlexItem>
          <EuiFormLabel>{title}</EuiFormLabel>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonGroup
            buttonSize="compressed"
            legend="This is a basic group"
            options={widthButtons}
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
          <EuiButtonIcon iconType="trash" color="danger" />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <div {...dragHandleProps} aria-label="Drag Handle">
            <EuiIcon type="grab" />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  return (
    <EuiPopover
      panelPaddingSize="s"
      button={manageControlsButton}
      isOpen={isManagementPopoverOpen}
      panelClassName="controlGroup--sortPopover"
      closePopover={() => setIsManagementPopoverOpen(false)}
    >
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
    </EuiPopover>
  );
};

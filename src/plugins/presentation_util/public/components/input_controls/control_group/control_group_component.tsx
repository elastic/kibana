/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiPopover,
  EuiButtonEmpty,
  EuiDragDropContext,
  EuiFlexGroup,
  EuiFlexItem,
  EuiDroppable,
  EuiDraggable,
  EuiText,
  euiDragDropReorder,
  DropResult,
  EuiIcon,
  htmlIdGenerator,
  EuiPanel,
} from '@elastic/eui';
import uuid from 'uuid';
import { OptionsListEmbeddable, OptionsListEmbeddableFactory } from '../control_types/options_list';
import { FlightField, flightFieldLabels } from '../__stories__/flights';
import { ControlFrame } from './control_frame/control_frame';

import './control_group.scss';

interface OptionsListStorybookArgs {
  fields: string[];
  twoLine: boolean;
  embeddableFactory: OptionsListEmbeddableFactory;
}

export const ControlGroupComponent = ({
  fields,
  twoLine,
  embeddableFactory,
}: OptionsListStorybookArgs) => {
  // const [embeddables, setEmbeddables] = useState<{ [key: string]: OptionsListEmbeddable }>({});
  // const [embeddableIds, setEmbeddableIds] = useState<string[]>([]);
  const [isOrderPopoverOpen, setIsOrderPopoverOpen] = useState(false);

  const [embeddables, setEmbeddables] = useState<OptionsListEmbeddable[]>([]);

  useEffect(() => {
    console.log('creating embeddables');
    const embeddableCreatePromises = fields.map((field) => {
      return embeddableFactory.create({
        field,
        id: uuid.v4(),
        indexPattern: '',
        multiSelect: true,
        twoLineLayout: twoLine,
        title: flightFieldLabels[field as FlightField],
      });
    });
    Promise.all(embeddableCreatePromises).then((newEmbeddables) => setEmbeddables(newEmbeddables));
  }, [fields, embeddableFactory, twoLine]);

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (source && destination) {
      setEmbeddables(euiDragDropReorder(embeddables, source.index, destination.index));
    }
  };

  const orderButton = (
    <EuiButtonEmpty
      size="xs"
      iconType="sortable"
      color="text"
      data-test-subj="inputControlsSortingButton"
      onClick={() => setIsOrderPopoverOpen(!isOrderPopoverOpen)}
    >
      Sort Me plz
    </EuiButtonEmpty>
  );

  return (
    <>
      <EuiPopover
        panelPaddingSize="s"
        button={orderButton}
        isOpen={isOrderPopoverOpen}
        panelClassName="controlGroup--sortPopover"
        closePopover={() => setIsOrderPopoverOpen(false)}
      >
        <EuiDragDropContext onDragEnd={onDragEnd}>
          <EuiDroppable droppableId="CUSTOM_HANDLE_DROPPABLE_AREA" spacing="s">
            {embeddables.map((embeddable, index) => (
              <EuiDraggable
                spacing="m"
                index={index}
                key={embeddable.id}
                customDragHandle={true}
                draggableId={embeddable.id}
              >
                {(provided) => (
                  <EuiPanel className="custom" paddingSize="m">
                    <EuiFlexGroup>
                      <EuiFlexItem grow={false}>
                        <div {...provided.dragHandleProps} aria-label="Drag Handle">
                          <EuiIcon type="grab" />
                        </div>
                      </EuiFlexItem>
                      <EuiFlexItem>{embeddable.getTitle()}</EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiPanel>
                )}
              </EuiDraggable>
            ))}
          </EuiDroppable>
        </EuiDragDropContext>
      </EuiPopover>
      <EuiFlexGroup alignItems="center" wrap={true} gutterSize={'s'}>
        {embeddables.map((embeddable) => (
          <EuiFlexItem key={embeddable.id}>
            <ControlFrame twoLine={twoLine} embeddable={embeddable} />
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    </>
  );
};

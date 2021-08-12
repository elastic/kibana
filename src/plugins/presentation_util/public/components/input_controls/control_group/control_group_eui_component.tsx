/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiButtonIcon,
  EuiPanel,
  euiDragDropReorder,
  DropResult,
  htmlIdGenerator,
} from '@elastic/eui';
import { OptionsListEmbeddable, OptionsListEmbeddableFactory } from '../control_types/options_list';
import { FlightField, flightFieldLabels } from '../__stories__/flights';
import { ControlFrame } from '../control_frame/control_frame';

interface ControlGroupArgs {
  fields: string[];
  twoLine: boolean;
  optionsListEmbeddableFactory: OptionsListEmbeddableFactory;
}

const makeId = htmlIdGenerator();

export const ControlGroupEuiComponent = ({
  optionsListEmbeddableFactory,
  twoLine,
  fields,
}: ControlGroupArgs) => {
  const [embeddables, setEmbeddables] = useState<OptionsListEmbeddable[]>([]);

  useEffect(() => {
    const embeddableCreatePromises = fields.map((field) => {
      return optionsListEmbeddableFactory.create({
        field,
        id: makeId(),
        indexPattern: '',
        multiSelect: true,
        twoLineLayout: twoLine,
        title: flightFieldLabels[field as FlightField],
      });
    });
    Promise.all(embeddableCreatePromises).then((newEmbeddables) => setEmbeddables(newEmbeddables));
  }, [fields, optionsListEmbeddableFactory, twoLine]);

  const onDragEnd: (result: DropResult) => void = ({ source, destination }) => {
    if (source && destination) {
      const items = euiDragDropReorder(embeddables, source.index, destination.index);
      setEmbeddables(items);
    }
  };

  return (
    <EuiDragDropContext onDragEnd={onDragEnd}>
      <EuiDroppable
        droppableId="COMPLEX_DROPPABLE_PARENT"
        type="MACRO"
        direction="horizontal"
        withPanel
        spacing="l"
        style={{ display: 'flex', flexWrap: 'wrap' }}
      >
        {embeddables.map((embeddable, embeddableIndex) => (
          <EuiDraggable
            key={embeddable.id}
            index={embeddableIndex}
            draggableId={`COMPLEX_DRAGGABLE_${embeddable.id}`}
            spacing="l"
            style={{ flexGrow: 1 }}
          >
            {(provided, state) => <ControlFrame twoLine={twoLine} embeddable={embeddable} />}
          </EuiDraggable>
        ))}
      </EuiDroppable>
    </EuiDragDropContext>
  );
};

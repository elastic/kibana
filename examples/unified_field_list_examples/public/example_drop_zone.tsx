/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { DropOverlayWrapper, DropType, Droppable, useDragDropContext } from '@kbn/dom-drag-drop';
import { EuiEmptyPrompt, EuiPanel } from '@elastic/eui';

const DROP_PROPS = {
  value: {
    id: 'exampleDropZone',
    humanData: {
      label: 'Drop zone for selecting fields',
    },
  },
  order: [1, 0, 0, 0],
  types: ['field_add'] as DropType[],
};

export interface ExampleDropZoneProps {
  onDropField: (fieldName: string) => void;
}

export const ExampleDropZone: React.FC<ExampleDropZoneProps> = ({ onDropField }) => {
  const [{ dragging }] = useDragDropContext();
  const draggingFieldName = dragging?.id;

  const onDroppingField = useMemo(() => {
    if (!draggingFieldName) {
      return undefined;
    }

    return () => onDropField(draggingFieldName);
  }, [onDropField, draggingFieldName]);

  const isDropAllowed = Boolean(onDroppingField);

  return (
    <Droppable
      dropTypes={isDropAllowed ? DROP_PROPS.types : undefined}
      value={DROP_PROPS.value}
      order={DROP_PROPS.order}
      onDrop={onDroppingField}
    >
      <DropOverlayWrapper isVisible={isDropAllowed}>
        <EuiPanel hasShadow={false} paddingSize="l" className="eui-fullHeight">
          <EuiEmptyPrompt
            iconType="beaker"
            title={<h3>Example drop zone</h3>}
            body={
              <p>
                Drop <strong>{draggingFieldName || 'a field'}</strong> here to select it
              </p>
            }
          />
        </EuiPanel>
      </DropOverlayWrapper>
    </Droppable>
  );
};

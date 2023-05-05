/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';
import { DragContext, DragDrop, ReorderProvider } from '@kbn/dom-drag-drop';
import {
  DimensionButton,
  DimensionTrigger,
  EmptyDimensionButton,
} from '@kbn/visualization-ui-components/public';
import React, { useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import { createCopiedAnnotation, EventAnnotationConfig } from '../../../common';
import { getAnnotationAccessor } from '..';

export const AnnotationList = ({
  annotations,
  selectAnnotation,
  update: updateAnnotations,
}: {
  annotations: EventAnnotationConfig[];
  selectAnnotation: (annotation: EventAnnotationConfig) => void;
  update: (annotations: EventAnnotationConfig[]) => void;
}) => {
  const [newAnnotationId, setNewAnnotationId] = useState<string>(uuidv4());
  useEffect(() => {
    setNewAnnotationId(uuidv4());
  }, [annotations.length]);

  const { dragging } = useContext(DragContext);

  const reorderableGroup = annotations.map(({ id }) => ({
    id,
  }));

  return (
    <div>
      <ReorderProvider id="annotationsGroup">
        {annotations.map((annotation, index) => (
          <div
            key={index}
            css={css`
              margin-top: ${euiThemeVars.euiSizeS};
              position: relative; // this is to properly contain the absolutely-positioned drop target in DragDrop
            `}
          >
            <DragDrop
              order={[index]}
              key={annotation.id}
              value={{
                id: annotation.id,
                humanData: {
                  label: annotation.label,
                },
              }}
              dragType="move"
              dropTypes={dragging ? ['reorder'] : []}
              reorderableGroup={reorderableGroup}
              draggable
              onDrop={(dropped) => {
                const newAnnotations = [...annotations];
                const sourceIndex = newAnnotations.findIndex(({ id }) => id === dropped.id);
                const targetIndex = index;

                if (sourceIndex !== targetIndex) {
                  const temp = newAnnotations[sourceIndex];
                  newAnnotations[sourceIndex] = newAnnotations[targetIndex];
                  newAnnotations[targetIndex] = temp;
                }

                updateAnnotations(newAnnotations);
              }}
            >
              <DimensionButton
                groupLabel={i18n.translate('eventAnnotation.groupEditor.addAnnotation', {
                  defaultMessage: 'Annotations',
                })}
                onClick={() => selectAnnotation(annotation)}
                onRemoveClick={() =>
                  updateAnnotations(annotations.filter(({ id }) => id !== annotation.id))
                }
                accessorConfig={getAnnotationAccessor(annotation)}
                label={annotation.label}
              >
                <DimensionTrigger label={annotation.label} />
              </DimensionButton>
            </DragDrop>
          </div>
        ))}
      </ReorderProvider>

      <div
        css={css`
          margin-top: ${euiThemeVars.euiSizeS};
        `}
      >
        <EmptyDimensionButton
          dataTestSubj="addAnnotation"
          label="Add annotation"
          ariaLabel="Add annotation"
          onClick={() => {
            const newAnnotation = createCopiedAnnotation(newAnnotationId, new Date().toISOString());

            selectAnnotation(newAnnotation);
            updateAnnotations([...annotations, newAnnotation]);
          }}
        />
      </div>
    </div>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';
import { DragContext, DragDrop, DropTargetSwapDuplicateCombine } from '@kbn/dom-drag-drop';
import {
  DimensionButton,
  DimensionTrigger,
  EmptyDimensionButton,
} from '@kbn/visualization-ui-components/public';
import React, { useCallback, useContext, useEffect, useState } from 'react';
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

  const addAnnotationText = i18n.translate('eventAnnotation.annotationList.add', {
    defaultMessage: 'Add annotation',
  });

  const addNewAnnotation = useCallback(
    (sourceAnnotationId?: string) => {
      const source = sourceAnnotationId
        ? annotations.find(({ id }) => id === sourceAnnotationId)
        : undefined;
      const newAnnotation = createCopiedAnnotation(
        newAnnotationId,
        new Date().toISOString(),
        source
      );

      if (!source) {
        selectAnnotation(newAnnotation);
      }
      updateAnnotations([...annotations, newAnnotation]);
    },
    [annotations, newAnnotationId, selectAnnotation, updateAnnotations]
  );

  return (
    <div>
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
            dragType="copy"
            dropTypes={[]}
            draggable
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

      <div
        css={css`
          margin-top: ${euiThemeVars.euiSizeS};
        `}
      >
        <DragDrop
          order={[annotations.length]}
          getCustomDropTarget={DropTargetSwapDuplicateCombine.getCustomDropTarget}
          getAdditionalClassesOnDroppable={
            DropTargetSwapDuplicateCombine.getAdditionalClassesOnDroppable
          }
          dropTypes={dragging ? ['field_add'] : []}
          value={{
            id: 'addAnnotation',
            humanData: {
              label: addAnnotationText,
            },
          }}
          onDrop={({ id: sourceId }) => addNewAnnotation(sourceId)}
        >
          <EmptyDimensionButton
            dataTestSubj="addAnnotation"
            label={addAnnotationText}
            ariaLabel={addAnnotationText}
            onClick={() => addNewAnnotation()}
          />
        </DragDrop>
      </div>
    </div>
  );
};

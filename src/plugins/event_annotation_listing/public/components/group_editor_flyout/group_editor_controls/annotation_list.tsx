/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { css } from '@emotion/react';
import {
  Droppable,
  Draggable,
  DropTargetSwapDuplicateCombine,
  ReorderProvider,
  useDragDropContext,
} from '@kbn/dom-drag-drop';
import {
  DimensionButton,
  DimensionTrigger,
  EmptyDimensionButton,
} from '@kbn/visualization-ui-components';
import React, { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { euiThemeVars } from '@kbn/ui-theme';
import { i18n } from '@kbn/i18n';
import type { EventAnnotationConfig } from '@kbn/event-annotation-common';
import { createCopiedAnnotation } from '@kbn/event-annotation-common';
import { getAnnotationAccessor } from '@kbn/event-annotation-components';

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

  const addAnnotationText = i18n.translate('eventAnnotationListing.annotationList.add', {
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

  const reorderAnnotations = useCallback(
    (
      sourceAnnotation: EventAnnotationConfig | undefined,
      targetAnnotation: EventAnnotationConfig
    ) => {
      if (!sourceAnnotation || sourceAnnotation.id === targetAnnotation.id) {
        return annotations;
      }
      const newAnnotations = annotations.filter((c) => c.id !== sourceAnnotation.id);
      const targetPosition = newAnnotations.findIndex((c) => c.id === targetAnnotation.id);
      const targetIndex = annotations.indexOf(sourceAnnotation);
      const sourceIndex = annotations.indexOf(targetAnnotation);
      newAnnotations.splice(
        targetIndex < sourceIndex ? targetPosition + 1 : targetPosition,
        0,
        sourceAnnotation
      );
      return updateAnnotations(newAnnotations);
    },
    [annotations, updateAnnotations]
  );

  const [{ dragging }] = useDragDropContext();

  return (
    <div
      css={css`
        background-color: ${euiThemeVars.euiColorLightestShade};
        padding: ${euiThemeVars.euiSizeS};
        border-radius: ${euiThemeVars.euiBorderRadius};
        overflow: visible;

        .domDragDrop-group {
          padding: ${euiThemeVars.euiSizeXS} ${euiThemeVars.euiSizeS};
          margin: -${euiThemeVars.euiSizeS} -${euiThemeVars.euiSizeS} 0 -${euiThemeVars.euiSizeS};
        }
      `}
    >
      <ReorderProvider>
        {annotations.map((annotation, index) => (
          <div
            key={index}
            css={css`
              position: relative; // this is to properly contain the absolutely-positioned drop target in Droppable
              & + div {
                margin-top: ${euiThemeVars.euiSizeS};
              }
            `}
          >
            <Draggable
              dragType="move"
              order={[index]}
              key={annotation.id}
              value={{
                id: annotation.id,
                humanData: {
                  label: annotation.label,
                },
              }}
              reorderableGroup={annotations}
            >
              <Droppable
                order={[index]}
                key={annotation.id}
                value={{
                  id: annotation.id,
                  humanData: {
                    label: annotation.label,
                  },
                }}
                dropTypes={dragging && dragging.id !== annotation.id ? ['reorder'] : []}
                reorderableGroup={annotations}
                onDrop={(source) => {
                  const sourceAnnotation = source
                    ? annotations.find(({ id }) => id === source.id)
                    : undefined;
                  reorderAnnotations(sourceAnnotation, annotation);
                }}
              >
                <DimensionButton
                  groupLabel={i18n.translate('eventAnnotationListing.groupEditor.addAnnotation', {
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
              </Droppable>
            </Draggable>
          </div>
        ))}
      </ReorderProvider>
      <div
        css={css`
          margin-top: ${euiThemeVars.euiSizeXS};
        `}
      >
        <Droppable
          order={[annotations.length]}
          getCustomDropTarget={DropTargetSwapDuplicateCombine.getCustomDropTarget}
          getAdditionalClassesOnDroppable={
            DropTargetSwapDuplicateCombine.getAdditionalClassesOnDroppable
          }
          dropTypes={dragging ? ['duplicate_compatible'] : []}
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
        </Droppable>
      </div>
    </div>
  );
};

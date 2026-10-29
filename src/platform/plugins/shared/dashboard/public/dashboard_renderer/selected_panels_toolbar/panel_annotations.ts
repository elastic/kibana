/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Minimal shape of a Lens XY annotation layer */
interface AnnotationLayer extends Record<string, unknown> {
  layerType: 'annotations';
  annotations: Array<{ isHidden?: boolean } & Record<string, unknown>>;
}

interface AttributesWithLayers {
  state?: {
    visualization?: {
      layers?: Array<{ layerType?: string } & Record<string, unknown>>;
    };
  };
}

/** Panels (Lens) that expose their full attributes and allow updating them */
interface PanelWithAttributes {
  getFullAttributes: () => AttributesWithLayers | undefined;
  updateAttributes: (attributes: AttributesWithLayers) => void;
}

const hasAttributes = (api: unknown): api is PanelWithAttributes =>
  typeof (api as PanelWithAttributes)?.getFullAttributes === 'function' &&
  typeof (api as PanelWithAttributes)?.updateAttributes === 'function';

const isAnnotationLayer = (layer: { layerType?: string }): layer is AnnotationLayer =>
  layer.layerType === 'annotations' && Array.isArray((layer as AnnotationLayer).annotations);

const getAnnotations = (api: PanelWithAttributes): AnnotationLayer['annotations'] =>
  (api.getFullAttributes()?.state?.visualization?.layers ?? [])
    .filter(isAnnotationLayer)
    .flatMap((layer) => layer.annotations);

const getPanelsWithAnnotations = (children: Record<string, unknown>, panelIds: Set<string>) =>
  Array.from(panelIds)
    .map((id) => children[id])
    .filter(hasAttributes)
    .filter((api) => getAnnotations(api).length > 0);

export type AnnotationsVisibility = 'none' | 'visible' | 'hidden';

/**
 * `none` when no selected panel has annotations, `visible` when at least one annotation is shown,
 * and `hidden` when every annotation in the selected panels is hidden.
 */
export const getAnnotationsVisibility = (
  children: Record<string, unknown>,
  panelIds: Set<string>
): AnnotationsVisibility => {
  const annotations = getPanelsWithAnnotations(children, panelIds).flatMap((api) =>
    getAnnotations(api)
  );
  if (annotations.length === 0) return 'none';
  return annotations.some((annotation) => !annotation.isHidden) ? 'visible' : 'hidden';
};

/** Hides or shows every annotation in the selected panels */
export const setAnnotationsHidden = (
  children: Record<string, unknown>,
  panelIds: Set<string>,
  isHidden: boolean
) => {
  getPanelsWithAnnotations(children, panelIds).forEach((api) => {
    const attributes = api.getFullAttributes();
    const visualization = attributes?.state?.visualization;
    if (!attributes || !visualization?.layers) return;
    api.updateAttributes({
      ...attributes,
      state: {
        ...attributes.state,
        visualization: {
          ...visualization,
          layers: visualization.layers.map((layer) =>
            isAnnotationLayer(layer)
              ? {
                  ...layer,
                  annotations: layer.annotations.map((annotation) => ({
                    ...annotation,
                    isHidden,
                  })),
                }
              : layer
          ),
        },
      },
    });
  });
};

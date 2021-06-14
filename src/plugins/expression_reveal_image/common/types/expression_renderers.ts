/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { IInterpreterRenderHandlers } from 'src/plugins/expressions';

type GenericRendererCallback = (callback: () => void) => void;

export interface RendererHandlers extends IInterpreterRenderHandlers {
  /** Handler to invoke when an element should be destroyed. */
  destroy?: () => void;
  /** Get the id of the element being rendered.  Can be used as a unique ID in a render function */
  getElementId?: () => string;
  /** Retrieves the value of the filter property on the element object persisted on the workpad */
  getFilter?: () => string;
  /** Handler to invoke when a renderer is considered complete */
  onComplete?: (fn: () => void) => void;
  /** Handler to invoke when a rendered embeddable is destroyed */
  onEmbeddableDestroyed?: () => void;
  /** Handler to invoke when the input to a function has changed internally */
  onEmbeddableInputChange?: (expression: string) => void;
  /** Handler to invoke when an element's dimensions have changed*/
  onResize?: GenericRendererCallback;
  /** Handler to invoke when an element should be resized. */
  resize?: (size: { height: number; width: number }) => void;
  /** Sets the value of the filter property on the element object persisted on the workpad */
  setFilter?: (filter: string) => void;
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  DataTableRecord,
  DocViewRenderProps,
} from '@kbn/unified-doc-viewer-plugin/public/types';

export type DocViewerComponent = React.FC<DocViewRenderProps>;
export type DocViewRenderFn = (
  domeNode: HTMLDivElement,
  renderProps: DocViewRenderProps
) => () => void;

export interface BaseDocViewInput {
  order: number;
  shouldShow?: (hit: DataTableRecord) => boolean;
  title: string;
}

export interface RenderDocViewInput extends BaseDocViewInput {
  render: DocViewRenderFn;
  component?: undefined;
  directive?: undefined;
}

interface ComponentDocViewInput extends BaseDocViewInput {
  component: DocViewerComponent;
  render?: undefined;
  directive?: undefined;
}

export type DocViewInput = ComponentDocViewInput | RenderDocViewInput;

export type DocView = DocViewInput & {
  shouldShow: NonNullable<DocViewInput['shouldShow']>;
};

export type DocViewInputFn = () => DocViewInput;

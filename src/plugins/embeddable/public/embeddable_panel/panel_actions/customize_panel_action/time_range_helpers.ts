/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { TimeRange } from '@kbn/es-query';

import { Embeddable, EmbeddableInput, EmbeddableOutput, IEmbeddable } from '../../../lib';

const VISUALIZE_EMBEDDABLE_TYPE = 'visualization';

type VisualizeEmbeddable = IEmbeddable<{ id: string }, EmbeddableOutput & { visTypeName: string }>;

function isVisualizeEmbeddable(
  embeddable: IEmbeddable | VisualizeEmbeddable
): embeddable is VisualizeEmbeddable {
  return embeddable.type === VISUALIZE_EMBEDDABLE_TYPE;
}

export interface TimeRangeInput extends EmbeddableInput {
  timeRange: TimeRange;
}

export function hasTimeRange(
  embeddable: IEmbeddable | Embeddable<TimeRangeInput>
): embeddable is Embeddable<TimeRangeInput> {
  return (embeddable as Embeddable<TimeRangeInput>).getInput().timeRange !== undefined;
}

export function isTimeRangeCompatible({ embeddable }: { embeddable: IEmbeddable }): boolean {
  const isInputControl =
    isVisualizeEmbeddable(embeddable) &&
    (embeddable as VisualizeEmbeddable).getOutput().visTypeName === 'input_control_vis';

  const isMarkdown =
    isVisualizeEmbeddable(embeddable) &&
    (embeddable as VisualizeEmbeddable).getOutput().visTypeName === 'markdown';

  const isImage = embeddable.type === 'image';
  const isNavigation = embeddable.type === 'navigation';

  return Boolean(
    embeddable &&
      hasTimeRange(embeddable) &&
      !isInputControl &&
      !isMarkdown &&
      !isImage &&
      !isNavigation
  );
}

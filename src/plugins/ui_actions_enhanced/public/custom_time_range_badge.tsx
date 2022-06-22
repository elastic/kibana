/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import { PrettyDuration } from '@elastic/eui';
import { IEmbeddable, Embeddable, EmbeddableInput } from '@kbn/embeddable-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { TimeRange } from '@kbn/es-query';
import { doesInheritTimeRange } from './does_inherit_time_range';
import { OpenModal, CommonlyUsedRange } from './types';

export const CUSTOM_TIME_RANGE_BADGE = 'CUSTOM_TIME_RANGE_BADGE';

export interface TimeRangeInput extends EmbeddableInput {
  timeRange: TimeRange;
}

function hasTimeRange(
  embeddable: IEmbeddable | Embeddable<TimeRangeInput>
): embeddable is Embeddable<TimeRangeInput> {
  return (embeddable as Embeddable<TimeRangeInput>).getInput().timeRange !== undefined;
}

export interface TimeBadgeActionContext {
  embeddable: Embeddable<TimeRangeInput>;
}

export class CustomTimeRangeBadge implements Action<TimeBadgeActionContext> {
  public readonly type = CUSTOM_TIME_RANGE_BADGE;
  public readonly id = CUSTOM_TIME_RANGE_BADGE;
  public order = 7;
  private openModal: OpenModal;
  private dateFormat: string;
  private commonlyUsedRanges: CommonlyUsedRange[];

  constructor({
    openModal,
    dateFormat,
    commonlyUsedRanges,
  }: {
    openModal: OpenModal;
    dateFormat: string;
    commonlyUsedRanges: CommonlyUsedRange[];
  }) {
    this.openModal = openModal;
    this.dateFormat = dateFormat;
    this.commonlyUsedRanges = commonlyUsedRanges;
  }

  public getDisplayName({ embeddable }: TimeBadgeActionContext) {
    return renderToString(
      <PrettyDuration
        timeFrom={embeddable.getInput().timeRange.from}
        timeTo={embeddable.getInput().timeRange.to}
        dateFormat={this.dateFormat}
      />
    );
  }

  public getIconType() {
    return 'calendar';
  }

  public async isCompatible({ embeddable }: TimeBadgeActionContext) {
    return Boolean(embeddable && hasTimeRange(embeddable) && !doesInheritTimeRange(embeddable));
  }

  public async execute({ embeddable }: TimeBadgeActionContext) {
    const isCompatible = await this.isCompatible({ embeddable });
    if (!isCompatible) {
      throw new IncompatibleActionError();
    }

    // Only here for typescript
    if (hasTimeRange(embeddable)) {
      const CustomizeTimeRangeModal = await import('./customize_time_range_modal').then(
        (m) => m.CustomizeTimeRangeModal
      );
      const modalSession = this.openModal(
        <CustomizeTimeRangeModal
          onClose={() => modalSession.close()}
          embeddable={embeddable}
          dateFormat={this.dateFormat}
          commonlyUsedRanges={this.commonlyUsedRanges}
        />,
        {
          'data-test-subj': 'customizeTimeRangeModal',
        }
      );
    }
  }
}

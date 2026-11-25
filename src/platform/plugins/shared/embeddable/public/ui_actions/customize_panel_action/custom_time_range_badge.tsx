/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, usePrettyDuration } from '@elastic/eui';
import type { TimeRange } from '@kbn/es-query';
import type {
  Action,
  ActionExecutionMeta,
  FrequentCompatibilityChangeAction,
} from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import React from 'react';

import { UI_SETTINGS } from '@kbn/data-plugin/common';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { apiPublishesTimeRange } from '@kbn/presentation-publishing';
import { map } from 'rxjs';
import { ACTION_CUSTOMIZE_PANEL, CUSTOM_TIME_RANGE_BADGE } from './constants';
import { core, uiActions } from '../../kibana_services';

const CustomTimeRangeBadgeContent = ({
  timeRange,
  onClick,
  dataTestSubj,
}: {
  timeRange: TimeRange;
  onClick: () => void;
  dataTestSubj?: string;
}) => {
  const prettyDuration = usePrettyDuration({
    timeFrom: timeRange.from,
    timeTo: timeRange.to,
    dateFormat: core.uiSettings.get<string>(UI_SETTINGS.DATE_FORMAT) ?? 'Browser',
  });
  return (
    <EuiBadge
      iconType="calendar"
      onClick={onClick}
      onClickAriaLabel={prettyDuration}
      data-test-subj={dataTestSubj}
    >
      {prettyDuration}
    </EuiBadge>
  );
};

export class CustomTimeRangeBadge
  implements Action<EmbeddableApiContext>, FrequentCompatibilityChangeAction<EmbeddableApiContext>
{
  public readonly type = CUSTOM_TIME_RANGE_BADGE;
  public readonly id = CUSTOM_TIME_RANGE_BADGE;
  public order = 7;

  public getDisplayName({ embeddable }: EmbeddableApiContext) {
    if (!apiPublishesTimeRange(embeddable)) throw new IncompatibleActionError();
    // The localized label is rendered by `MenuItem` via `usePrettyDuration`.
    return '';
  }

  public readonly MenuItem = ({
    context,
    dataTestSubj,
  }: {
    context: EmbeddableApiContext;
    dataTestSubj?: string;
  }) => {
    const { embeddable } = context;
    if (!apiPublishesTimeRange(embeddable)) throw new IncompatibleActionError();

    const timeRange = embeddable.timeRange$.getValue();
    if (!timeRange) {
      throw new IncompatibleActionError();
    }
    return (
      <CustomTimeRangeBadgeContent
        timeRange={timeRange}
        onClick={() => this.execute(context as Parameters<typeof this.execute>[0])}
        dataTestSubj={dataTestSubj}
      />
    );
  };

  public couldBecomeCompatible({ embeddable }: EmbeddableApiContext) {
    return apiPublishesTimeRange(embeddable);
  }

  public getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext) {
    return apiPublishesTimeRange(embeddable)
      ? embeddable.timeRange$.pipe(map(() => undefined))
      : undefined;
  }

  public async execute(context: ActionExecutionMeta & EmbeddableApiContext) {
    const action = await uiActions.getAction(ACTION_CUSTOMIZE_PANEL);
    action.execute(context);
  }

  public getIconType() {
    return 'calendar';
  }

  public async isCompatible({ embeddable }: EmbeddableApiContext) {
    if (apiPublishesTimeRange(embeddable)) {
      const timeRange = embeddable.timeRange$.value;
      return Boolean(timeRange);
    }
    return false;
  }
}

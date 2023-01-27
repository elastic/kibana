/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { Subject } from 'rxjs';
import { distinctUntilChanged, filter, map, take, takeUntil } from 'rxjs/operators';
import { i18n } from '@kbn/i18n';
import { OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { ViewMode } from '../../../../types';
import { IEmbeddable, Embeddable, EmbeddableInput, CommonlyUsedRange } from '../../../..';
import { CustomizePanelEditor } from './customize_panel_editor';

export const ACTION_CUSTOMIZE_PANEL = 'ACTION_CUSTOMIZE_PANEL';

export interface TimeRangeInput extends EmbeddableInput {
  timeRange: TimeRange;
}

export function hasTimeRange(
  embeddable: IEmbeddable | Embeddable<TimeRangeInput>
): embeddable is Embeddable<TimeRangeInput> {
  return (embeddable as Embeddable<TimeRangeInput>).getInput().timeRange !== undefined;
}

export interface CustomizePanelActionContext {
  embeddable: IEmbeddable | Embeddable<TimeRangeInput>;
}

export class CustomizePanelAction implements Action<CustomizePanelActionContext> {
  public type = ACTION_CUSTOMIZE_PANEL;
  public id = ACTION_CUSTOMIZE_PANEL;
  public order = 40;

  constructor(
    protected readonly overlays: OverlayStart,
    protected readonly theme: ThemeServiceStart,
    protected readonly commonlyUsedRanges?: CommonlyUsedRange[],
    protected readonly dateFormat?: string
  ) {}

  public getDisplayName({ embeddable }: CustomizePanelActionContext): string {
    return i18n.translate('embeddableApi.customizePanel.action.displayName', {
      defaultMessage: 'Edit panel settings',
    });
  }

  public getIconType() {
    return 'pencil';
  }

  public async isCompatible({ embeddable }: CustomizePanelActionContext) {
    return embeddable.getInput().viewMode === ViewMode.EDIT ? true : false;
  }

  public async execute({ embeddable }: CustomizePanelActionContext) {
    const isCompatible = await this.isCompatible({ embeddable });
    if (!isCompatible) {
      throw new IncompatibleActionError();
    }

    const closed$ = new Subject<true>();
    const close = () => {
      closed$.next(true);
      handle.close();
    };

    const handle = this.overlays.openFlyout(
      toMountPoint(
        <CustomizePanelEditor
          embeddable={embeddable}
          dateFormat={this.dateFormat}
          commonlyUsedRanges={this.commonlyUsedRanges}
          onClose={close}
        />,
        { theme$: this.theme.theme$ }
      ),
      {
        size: 's',
        'data-test-subj': 'customizePanel',
      }
    );

    // Close flyout on dashboard switch to "view" mode or on embeddable destroy.
    embeddable
      .getInput$()
      .pipe(
        takeUntil(closed$),
        map((input) => input.viewMode),
        distinctUntilChanged(),
        filter((mode) => mode !== ViewMode.EDIT),
        take(1)
      )
      .subscribe({ next: close, complete: close });
  }
}

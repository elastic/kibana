/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { OverlayRef, OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { TimeRange } from '@kbn/es-query';
import { ViewMode } from '../../../../types';
import {
  IEmbeddable,
  Embeddable,
  EmbeddableInput,
  CommonlyUsedRange,
  EmbeddableOutput,
} from '../../../..';
import { CustomizePanelEditor } from './customize_panel_editor';

export const ACTION_CUSTOMIZE_PANEL = 'ACTION_CUSTOMIZE_PANEL';

const VISUALIZE_EMBEDDABLE_TYPE = 'visualization';

type VisualizeEmbeddable = IEmbeddable<{ id: string }, EmbeddableOutput & { visTypeName: string }>;

interface TracksOverlays {
  openOverlay: (ref: OverlayRef) => void;
  clearOverlays: () => void;
}

function tracksOverlays(root: unknown): root is TracksOverlays {
  return Boolean((root as TracksOverlays).openOverlay && (root as TracksOverlays).clearOverlays);
}

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

  protected isTimeRangeCompatible({ embeddable }: CustomizePanelActionContext): boolean {
    const isInputControl =
      isVisualizeEmbeddable(embeddable) &&
      (embeddable as VisualizeEmbeddable).getOutput().visTypeName === 'input_control_vis';

    const isMarkdown =
      isVisualizeEmbeddable(embeddable) &&
      (embeddable as VisualizeEmbeddable).getOutput().visTypeName === 'markdown';

    const isImage = embeddable.type === 'image';

    return Boolean(
      embeddable && hasTimeRange(embeddable) && !isInputControl && !isMarkdown && !isImage
    );
  }

  public getDisplayName({ embeddable }: CustomizePanelActionContext): string {
    return i18n.translate('embeddableApi.customizePanel.action.displayName', {
      defaultMessage: 'Edit panel settings',
    });
  }

  public getIconType() {
    return 'pencil';
  }

  public async isCompatible({ embeddable }: CustomizePanelActionContext) {
    // It should be possible to customize just the time range in View mode
    return (
      embeddable.getInput().viewMode === ViewMode.EDIT || this.isTimeRangeCompatible({ embeddable })
    );
  }

  public async execute({ embeddable }: CustomizePanelActionContext) {
    const isCompatible = await this.isCompatible({ embeddable });
    if (!isCompatible) {
      throw new IncompatibleActionError();
    }

    // send the overlay ref to the root embeddable if it is capable of tracking overlays
    const rootEmbeddable = embeddable.getRoot();
    const overlayTracker = tracksOverlays(rootEmbeddable) ? rootEmbeddable : undefined;

    const handle = this.overlays.openFlyout(
      toMountPoint(
        <CustomizePanelEditor
          embeddable={embeddable}
          timeRangeCompatible={this.isTimeRangeCompatible({ embeddable })}
          dateFormat={this.dateFormat}
          commonlyUsedRanges={this.commonlyUsedRanges}
          onClose={() => {
            if (overlayTracker) overlayTracker.clearOverlays();
            handle.close();
          }}
        />,
        { theme$: this.theme.theme$ }
      ),
      {
        size: 's',
        'data-test-subj': 'customizePanel',
      }
    );
    overlayTracker?.openOverlay(handle);
  }
}

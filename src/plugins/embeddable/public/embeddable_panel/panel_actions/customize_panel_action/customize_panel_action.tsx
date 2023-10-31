/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { TimeRange } from '@kbn/es-query';
import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { core } from '../../../kibana_services';
import {
  IEmbeddable,
  Embeddable,
  EmbeddableInput,
  EmbeddableOutput,
  EditPanelAction,
} from '../../..';
import { ViewMode, CommonlyUsedRange } from '../../../lib/types';
import { tracksOverlays } from '../track_overlays';
import { CustomizePanelEditor } from './customize_panel_editor';

export const ACTION_CUSTOMIZE_PANEL = 'ACTION_CUSTOMIZE_PANEL';

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
    protected readonly editPanel: EditPanelAction,
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

  public getDisplayName({ embeddable }: CustomizePanelActionContext): string {
    return i18n.translate('embeddableApi.customizePanel.action.displayName', {
      defaultMessage: 'Panel settings',
    });
  }

  public getIconType() {
    return 'gear';
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

    const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
      uiSettings: core.uiSettings,
    });

    const onEdit = () => {
      this.editPanel.execute({ embeddable });
    };

    const handle = this.overlays.openFlyout(
      toMountPoint(
        <KibanaReactContextProvider>
          <CustomizePanelEditor
            embeddable={embeddable}
            timeRangeCompatible={this.isTimeRangeCompatible({ embeddable })}
            dateFormat={this.dateFormat}
            commonlyUsedRanges={this.commonlyUsedRanges}
            onClose={() => {
              if (overlayTracker) overlayTracker.clearOverlays();
              handle.close();
            }}
            onEdit={onEdit}
          />
        </KibanaReactContextProvider>,
        { theme: this.theme, i18n: core.i18n }
      ),
      {
        size: 's',
        'data-test-subj': 'customizePanel',
        onClose: (overlayRef) => {
          if (overlayTracker) overlayTracker.clearOverlays();
          overlayRef.close();
        },
        maxWidth: true,
      }
    );
    overlayTracker?.openOverlay(handle);
  }
}

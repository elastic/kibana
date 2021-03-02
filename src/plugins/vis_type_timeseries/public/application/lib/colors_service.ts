/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PersistedState } from '../../../../visualizations/public';
import { labelDateFormatter } from '../../application/components/lib/label_date_formatter';

/**
 * Overwrite Colors Servive
 *
 * @internal
 */
export interface OverwrittenColors {
  id: string;
  overwrite: { [key: string]: string };
}

export class ColorsService {
  private overwrittenColors: OverwrittenColors[];
  public readonly uiState: PersistedState;

  constructor(uiState: PersistedState) {
    this.uiState = uiState;
    this.overwrittenColors = uiState.get('vis.colors', []);
  }

  private getColorsBySeriesId(seriesId: string) {
    const colors: OverwrittenColors | undefined = this.overwrittenColors.find(
      ({ id }) => id === seriesId
    );
    return colors;
  }

  public addToUiState(seriesName: string, seriesId: string, color: string) {
    const seriesColors = this.getColorsBySeriesId(seriesId);
    if (!seriesColors) {
      this.overwrittenColors.push({
        id: seriesId,
        overwrite: { [seriesName]: color },
      });
    } else {
      seriesColors.overwrite[seriesName] = color;
    }
    // update the UiState
    if (this.uiState?.set) {
      this.uiState.setSilent('vis.colors', null);
      this.uiState.set('vis.colors', this.overwrittenColors);
      this.uiState.emit('colorChanged');
    }
  }

  public deleteFromUiState(seriesName: string, seriesId: string) {
    const seriesColors = this.getColorsBySeriesId(seriesId);
    delete seriesColors?.overwrite[seriesName];
    // update the UiState
    if (this.uiState?.set) {
      this.uiState.setSilent('vis.colors', null);
      this.uiState.set('vis.colors', this.overwrittenColors);
      this.uiState.emit('colorChanged');
    }
  }

  public getSeriesColor(seriesId: string, label: string, labelFormatted: string) {
    const seriesColors = this.getColorsBySeriesId(seriesId);
    let seriesName = label.toString();
    if (labelFormatted) {
      seriesName = labelDateFormatter(labelFormatted);
    }
    if (seriesColors && Object.keys(seriesColors?.overwrite).includes(seriesName)) {
      return seriesColors?.overwrite[seriesName];
    }

    return null;
  }
}

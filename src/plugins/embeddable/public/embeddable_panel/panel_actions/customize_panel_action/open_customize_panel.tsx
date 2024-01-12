/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import { createKibanaReactContext } from '@kbn/kibana-react-plugin/public';
import { toMountPoint } from '@kbn/react-kibana-mount';

import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { core } from '../../../kibana_services';
import { Embeddable, IEmbeddable } from '../../../lib';
import { EditPanelAction } from '../edit_panel_action/edit_panel_action';
import { tracksOverlays } from '../track_overlays';
import { CustomizePanelEditor } from './customize_panel_editor';
import { isTimeRangeCompatible, TimeRangeInput } from './time_range_helpers';

export const openCustomizePanelFlyout = ({
  editPanel,
  focusOnTitle,
  embeddable,
}: {
  editPanel: EditPanelAction;
  focusOnTitle?: boolean;
  embeddable: IEmbeddable | Embeddable<TimeRangeInput>;
}) => {
  // send the overlay ref to the root embeddable if it is capable of tracking overlays
  const rootEmbeddable = embeddable.getRoot();
  const overlayTracker = tracksOverlays(rootEmbeddable) ? rootEmbeddable : undefined;

  const commonlyUsedRanges = core.uiSettings.get(UI_SETTINGS.TIMEPICKER_QUICK_RANGES);
  const dateFormat = core.uiSettings.get(UI_SETTINGS.DATE_FORMAT);

  const { Provider: KibanaReactContextProvider } = createKibanaReactContext({
    uiSettings: core.uiSettings,
  });

  const onEdit = () => {
    editPanel.execute({ embeddable });
  };

  const handle = core.overlays.openFlyout(
    toMountPoint(
      <KibanaReactContextProvider>
        <CustomizePanelEditor
          focusOnTitle={focusOnTitle}
          embeddable={embeddable}
          timeRangeCompatible={isTimeRangeCompatible({ embeddable })}
          dateFormat={dateFormat}
          commonlyUsedRanges={commonlyUsedRanges}
          onClose={() => {
            if (overlayTracker) overlayTracker.clearOverlays();
            handle.close();
          }}
          onEdit={onEdit}
        />
      </KibanaReactContextProvider>,
      { theme: core.theme, i18n: core.i18n }
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
};

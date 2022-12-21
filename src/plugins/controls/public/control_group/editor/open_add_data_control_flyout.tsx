/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { ControlGroupStrings } from '../control_group_strings';
import { ControlGroupContainer, setFlyoutRef } from '../embeddable/control_group_container';
import { pluginServices } from '../../services';
import { ControlEditor } from './control_editor';
import { OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '../..';

export function openAddDataControlFlyout(controlGroup: ControlGroupContainer) {
  const {
    overlays: { openFlyout, openConfirm },
    controls: { getControlTypes, getControlFactory },
    theme: { theme$ },
  } = pluginServices.getServices();
  const ControlsServicesProvider = pluginServices.getContextProvider();

  let controlInput: Partial<DataControlInput> = {};
  const onCancel = () => {
    if (Object.keys(controlInput).length === 0) {
      controlGroup.closeAllFlyouts();
      return;
    }

    openConfirm(ControlGroupStrings.management.discardNewControl.getSubtitle(), {
      confirmButtonText: ControlGroupStrings.management.discardNewControl.getConfirm(),
      cancelButtonText: ControlGroupStrings.management.discardNewControl.getCancel(),
      title: ControlGroupStrings.management.discardNewControl.getTitle(),
      buttonColor: 'danger',
    }).then((confirmed) => {
      if (confirmed) {
        controlGroup.closeAllFlyouts();
      }
    });
  };

  const flyoutInstance = openFlyout(
    toMountPoint(
      <ControlsServicesProvider>
        <ControlEditor
          setLastUsedDataViewId={(newId) => controlGroup.setLastUsedDataViewId(newId)}
          getRelevantDataViewId={controlGroup.getMostRelevantDataViewId}
          isCreate={true}
          width={controlGroup.getInput().defaultControlWidth ?? DEFAULT_CONTROL_WIDTH}
          grow={controlGroup.getInput().defaultControlGrow ?? DEFAULT_CONTROL_GROW}
          updateTitle={(newTitle) => (controlInput.title = newTitle)}
          updateWidth={(defaultControlWidth) => controlGroup.updateInput({ defaultControlWidth })}
          updateGrow={(defaultControlGrow: boolean) => controlGroup.updateInput({ defaultControlGrow })}
          onSave={(type) => {
            controlGroup.closeAllFlyouts();
            if (!type) {
              return;
            }

            const factory = getControlFactory(type) as IEditableControlFactory;
            if (factory.presaveTransformFunction) {
              controlInput = factory.presaveTransformFunction(controlInput);
            }

            if (type === OPTIONS_LIST_CONTROL) {
              controlGroup.addOptionsListControl(controlInput as AddOptionsListControlProps);
              return;
            }

            if (type === RANGE_SLIDER_CONTROL) {
              controlGroup.addRangeSliderControl(controlInput as AddRangeSliderControlProps);
              return;
            }

            controlGroup.addDataControlFromField(controlInput as AddDataControlProps);
          }}
          onCancel={onCancel}
          onTypeEditorChange={(partialInput) =>
            (controlInput = { ...controlInput, ...partialInput })
          }
        />
      </ControlsServicesProvider>,
      { theme$ }
    ),
    {
      'aria-label': ControlGroupStrings.manageControl.getFlyoutCreateTitle(),
      outsideClickCloses: false,
      onClose: () => {
        onCancel();
      },
    }
  );
  setFlyoutRef(flyoutInstance);
}
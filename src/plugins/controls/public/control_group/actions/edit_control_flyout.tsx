/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import React, { useState } from 'react';

import { EmbeddableFactoryNotFoundError } from '@kbn/embeddable-plugin/public';

import { DataControlInput, ControlEmbeddable, IEditableControlFactory } from '../../types';
import { pluginServices } from '../../services';
import { ControlGroupStrings } from '../control_group_strings';
import { useControlGroupContainerContext } from '../control_group_renderer';
import { ControlEditor } from '../editor/control_editor';

export const EditControlFlyout = ({
  embeddable,
  closeFlyout,
  removeControl,
}: {
  embeddable: ControlEmbeddable<DataControlInput>;
  closeFlyout: () => void;
  removeControl: () => void;
}) => {
  // Controls Services Context
  const {
    overlays: { openConfirm },
    controls: { getControlFactory },
  } = pluginServices.getServices();
  // Redux embeddable container Context
  const reduxContext = useControlGroupContainerContext();
  const {
    embeddableInstance: controlGroup,
    actions: { setControlWidth, setControlGrow },
    useEmbeddableSelector,
    useEmbeddableDispatch,
  } = reduxContext;
  const dispatch = useEmbeddableDispatch();

  // current state
  const panels = useEmbeddableSelector((state) => state.explicitInput.panels);
  const panel = panels[embeddable.id];

  const [currentGrow, setCurrentGrow] = useState(panel.grow);
  const [currentWidth, setCurrentWidth] = useState(panel.width);
  const [inputToReturn, setInputToReturn] = useState<Partial<DataControlInput>>({});

  const onCancel = () => {
    if (
      isEqual(panel.explicitInput, {
        ...panel.explicitInput,
        ...inputToReturn,
      }) &&
      currentGrow === panel.grow &&
      currentWidth === panel.width
    ) {
      closeFlyout();
      return;
    }
    openConfirm(ControlGroupStrings.management.discardChanges.getSubtitle(), {
      confirmButtonText: ControlGroupStrings.management.discardChanges.getConfirm(),
      cancelButtonText: ControlGroupStrings.management.discardChanges.getCancel(),
      title: ControlGroupStrings.management.discardChanges.getTitle(),
      buttonColor: 'danger',
    }).then((confirmed) => {
      if (confirmed) {
        closeFlyout();
      }
    });
  };

  const onSave = async (type?: string) => {
    if (!type) {
      closeFlyout();
      return;
    }

    const factory = getControlFactory(type) as IEditableControlFactory;
    if (!factory) throw new EmbeddableFactoryNotFoundError(type);
    if (factory.presaveTransformFunction) {
      setInputToReturn(factory.presaveTransformFunction(inputToReturn, embeddable));
    }

    if (currentWidth !== panel.width)
      dispatch(setControlWidth({ width: currentWidth, embeddableId: embeddable.id }));
    if (currentGrow !== panel.grow)
      dispatch(setControlGrow({ grow: currentGrow, embeddableId: embeddable.id }));

    closeFlyout();
    await controlGroup.replaceEmbeddable(embeddable.id, inputToReturn, type);
  };

  return (
    <ControlEditor
      isCreate={false}
      width={panel.width}
      grow={panel.grow}
      embeddable={embeddable}
      title={embeddable.getTitle()}
      onCancel={() => onCancel()}
      updateTitle={(newTitle) => (inputToReturn.title = newTitle)}
      setLastUsedDataViewId={(lastUsed) => controlGroup.setLastUsedDataViewId(lastUsed)}
      updateWidth={(newWidth) => setCurrentWidth(newWidth)}
      updateGrow={(newGrow) => setCurrentGrow(newGrow)}
      onTypeEditorChange={(partialInput) => {
        setInputToReturn({ ...inputToReturn, ...partialInput });
      }}
      onSave={(type) => onSave(type)}
      removeControl={() => {
        closeFlyout();
        removeControl();
      }}
    />
  );
};

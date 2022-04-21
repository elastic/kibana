/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'fast-deep-equal';

import { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';
import { TIME_SLIDER_CONTROL } from '../..';
import { ControlEmbeddable, IEditableControlFactory } from '../../types';
import {
  createOptionsListExtract,
  createOptionsListInject,
} from '../../../common/control_types/options_list/options_list_persistable_state';
import { TimeSliderEditor } from './time_slider_editor';
import { TimeSliderControlEmbeddableInput } from '../../../common/control_types/time_slider/types';
import { TimeSliderStrings } from './time_slider_strings';

export class TimesliderEmbeddableFactory
  implements EmbeddableFactoryDefinition, IEditableControlFactory<TimeSliderControlEmbeddableInput>
{
  public type = TIME_SLIDER_CONTROL;
  public canCreateNew = () => false;

  constructor() {}

  public async create(initialInput: TimeSliderControlEmbeddableInput, parent?: IContainer) {
    const { TimeSliderControlEmbeddable } = await import('./time_slider_embeddable');

    return Promise.resolve(new TimeSliderControlEmbeddable(initialInput, {}, parent));
  }

  public presaveTransformFunction = (
    newInput: Partial<TimeSliderControlEmbeddableInput>,
    embeddable?: ControlEmbeddable<TimeSliderControlEmbeddableInput>
  ) => {
    if (
      embeddable &&
      (!deepEqual(newInput.fieldName, embeddable.getInput().fieldName) ||
        !deepEqual(newInput.dataViewId, embeddable.getInput().dataViewId))
    ) {
      // if the field name or data view id has changed in this editing session, selected options are invalid, so reset them.
      newInput.value = undefined;
    }
    return newInput;
  };

  public controlEditorComponent = TimeSliderEditor;

  public isEditable = () => Promise.resolve(false);

  public getDisplayName = () => TimeSliderStrings.getDisplayName();
  public getIconType = () => 'clock';
  public getDescription = () => TimeSliderStrings.getDescription();

  public inject = createOptionsListInject();
  public extract = createOptionsListExtract();
}

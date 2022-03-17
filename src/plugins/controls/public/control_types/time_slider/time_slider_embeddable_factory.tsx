/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'fast-deep-equal';

//import { OptionsListEditor } from './options_list_editor';
import { ControlEmbeddable, IEditableControlFactory } from '../../types';
//import { OptionsListEmbeddableInput, OPTIONS_LIST_CONTROL } from './types';
import { Embeddable, EmbeddableFactoryDefinition, IContainer } from '../../../../embeddable/public';
import {
  createOptionsListExtract,
  createOptionsListInject,
} from '../../../common/control_types/options_list/options_list_persistable_state';
import { TimeSliderEditor } from './time_slider_editor';
import { TimeSliderControlEmbeddableInput } from './time_slider_embeddable';
import { pluginServices } from '../../services';

export class TimesliderEmbeddableFactory
  implements EmbeddableFactoryDefinition, IEditableControlFactory<TimeSliderControlEmbeddableInput>
{
  public type = 'TIME_SLIDER';
  public canCreateNew = () => false;

  private EmbeddableClass?: Embeddable;

  constructor() {}

  public async create(initialInput: TimeSliderControlEmbeddableInput, parent?: IContainer) {
    if (!this.EmbeddableClass) {
      const { TimeSliderControlEmbeddableBuilder } = await import('./time_slider_embeddable');
      const {
        data: { fetchFieldRange, getDataView },
      } = pluginServices.getServices();
      this.EmbeddableClass = TimeSliderControlEmbeddableBuilder({
        fetchRange: fetchFieldRange,
        getDataView,
      });
    }

    return new this.EmbeddableClass!(initialInput, {}, parent);

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
      //newInput.selectedOptions = [];
    }
    return newInput;
  };

  public controlEditorComponent = TimeSliderEditor;

  public isEditable = () => Promise.resolve(false);

  public getDisplayName = () => 'Time Slider';

  public inject = createOptionsListInject();
  public extract = createOptionsListExtract();
}

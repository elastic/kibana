/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';
import { lazyLoadReduxEmbeddablePackage } from '@kbn/presentation-util-plugin/public';
import {
  createOptionsListExtract,
  createOptionsListInject,
} from '../../../common/control_types/options_list/options_list_persistable_state';
import { TIME_SLIDER_CONTROL } from '../..';
import { ControlInput, IEditableControlFactory } from '../../types';
import { TimeSliderStrings } from '../time_slider/time_slider_strings';

export class TimeSliderEmbeddableFactory
  implements EmbeddableFactoryDefinition, IEditableControlFactory<ControlInput>
{
  public type = TIME_SLIDER_CONTROL;

  constructor() {}

  public async create(initialInput: any, parent?: IContainer) {
    const reduxEmbeddablePackage = await lazyLoadReduxEmbeddablePackage();
    const { TimeSliderControlEmbeddable } = await import('./time_slider_embeddable');

    return Promise.resolve(
      new TimeSliderControlEmbeddable(reduxEmbeddablePackage, initialInput, {}, parent)
    );
  }

  public isFieldCompatible = () => false;

  public isEditable = () => Promise.resolve(false);

  public getDisplayName = () => TimeSliderStrings.getDisplayName();
  public getIconType = () => 'clock';
  public getDescription = () => TimeSliderStrings.getDescription();

  public inject = createOptionsListInject();
  public extract = createOptionsListExtract();
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'fast-deep-equal';

import { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';
import { lazyLoadReduxEmbeddablePackage } from '@kbn/presentation-util-plugin/public';
import { i18n } from '@kbn/i18n';

import {
  createRangeSliderExtract,
  createRangeSliderInject,
} from '../../../common/range_slider/range_slider_persistable_state';
import {
  RangeSliderEmbeddableInput,
  RANGE_SLIDER_CONTROL,
} from '../../../common/range_slider/types';
import { ControlEmbeddable, DataControlField, IEditableControlFactory } from '../../types';

export class RangeSliderEmbeddableFactory
  implements EmbeddableFactoryDefinition, IEditableControlFactory<RangeSliderEmbeddableInput>
{
  public type = RANGE_SLIDER_CONTROL;

  public getDisplayName = () =>
    i18n.translate('controls.rangeSlider.displayName', {
      defaultMessage: 'Range slider',
    });

  public getDescription = () =>
    i18n.translate('controls.rangeSlider.description', {
      defaultMessage: 'Add a control for selecting a range of field values.',
    });

  public getIconType = () => 'controlsHorizontal';

  public canCreateNew = () => false;

  public isEditable = () => Promise.resolve(false);

  public async create(initialInput: RangeSliderEmbeddableInput, parent?: IContainer) {
    const reduxEmbeddablePackage = await lazyLoadReduxEmbeddablePackage();
    const { RangeSliderEmbeddable } = await import('./range_slider_embeddable');

    return Promise.resolve(
      new RangeSliderEmbeddable(reduxEmbeddablePackage, initialInput, {}, parent)
    );
  }

  public presaveTransformFunction = (
    newInput: Partial<RangeSliderEmbeddableInput>,
    embeddable?: ControlEmbeddable<RangeSliderEmbeddableInput>
  ) => {
    if (
      embeddable &&
      ((newInput.fieldName && !deepEqual(newInput.fieldName, embeddable.getInput().fieldName)) ||
        (newInput.dataViewId && !deepEqual(newInput.dataViewId, embeddable.getInput().dataViewId)))
    ) {
      // if the field name or data view id has changed in this editing session, selected values are invalid, so reset them.
      newInput.value = ['', ''];
    }

    return newInput;
  };

  public isFieldCompatible = (dataControlField: DataControlField) => {
    if (dataControlField.field.aggregatable && dataControlField.field.type === 'number') {
      dataControlField.compatibleControlTypes.push(this.type);
    }
  };

  public inject = createRangeSliderInject();
  public extract = createRangeSliderExtract();
}

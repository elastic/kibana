/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'fast-deep-equal';

import { i18n } from '@kbn/i18n';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { lazyLoadReduxToolsPackage } from '@kbn/presentation-util-plugin/public';
import { EmbeddableFactoryDefinition, IContainer } from '@kbn/embeddable-plugin/public';

import {
  createOptionsListExtract,
  createOptionsListInject,
} from '../../../common/options_list/options_list_persistable_state';
import {
  OptionsListEmbeddableInput,
  OPTIONS_LIST_CONTROL,
} from '../../../common/options_list/types';
import { OptionsListEditorOptions } from '../components/options_list_editor_options';
import { ControlEmbeddable, IEditableControlFactory } from '../../types';

export class OptionsListEmbeddableFactory
  implements EmbeddableFactoryDefinition, IEditableControlFactory<OptionsListEmbeddableInput>
{
  public type = OPTIONS_LIST_CONTROL;
  public canCreateNew = () => false;

  constructor() {}

  public async create(initialInput: OptionsListEmbeddableInput, parent?: IContainer) {
    const reduxEmbeddablePackage = await lazyLoadReduxToolsPackage();
    const { OptionsListEmbeddable } = await import('./options_list_embeddable');
    return Promise.resolve(
      new OptionsListEmbeddable(reduxEmbeddablePackage, initialInput, {}, parent)
    );
  }

  public presaveTransformFunction = (
    newInput: Partial<OptionsListEmbeddableInput>,
    embeddable?: ControlEmbeddable<OptionsListEmbeddableInput>
  ) => {
    if (
      embeddable &&
      ((newInput.fieldName && !deepEqual(newInput.fieldName, embeddable.getInput().fieldName)) ||
        (newInput.dataViewId && !deepEqual(newInput.dataViewId, embeddable.getInput().dataViewId)))
    ) {
      // if the field name or data view id has changed in this editing session, reset all selections
      newInput.selectedOptions = undefined;
      newInput.existsSelected = undefined;
      newInput.exclude = undefined;
      newInput.sort = undefined;
    }
    return newInput;
  };

  public isFieldCompatible = (field: DataViewField) => {
    return (
      !field.spec.scripted &&
      field.aggregatable &&
      ['string', 'boolean', 'ip', 'date', 'number'].includes(field.type)
    );
  };

  public controlEditorOptionsComponent = OptionsListEditorOptions;

  public isEditable = () => Promise.resolve(true);

  public getDisplayName = () =>
    i18n.translate('controls.optionsList.displayName', {
      defaultMessage: 'Options list',
    });
  public getIconType = () => 'editorChecklist';
  public getDescription = () =>
    i18n.translate('controls.optionsList.description', {
      defaultMessage: 'Add a menu for selecting field values.',
    });

  public inject = createOptionsListInject();
  public extract = createOptionsListExtract();
}

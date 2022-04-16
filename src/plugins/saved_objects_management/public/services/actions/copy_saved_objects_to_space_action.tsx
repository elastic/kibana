/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import { i18n } from '@kbn/i18n';

import type { CopyToSpaceFlyoutProps, SpacesApiUi } from '@kbn/spaces-plugin/public';
import type { SavedObjectsManagementRecord } from '../types';
import { SavedObjectsManagementAction } from '../types';

interface WrapperProps {
  spacesApiUi: SpacesApiUi;
  props: CopyToSpaceFlyoutProps;
}

const Wrapper = ({ spacesApiUi, props }: WrapperProps) => {
  const LazyComponent = useMemo(() => spacesApiUi.components.getCopyToSpaceFlyout, [spacesApiUi]);

  return <LazyComponent {...props} />;
};

export class CopyToSpaceSavedObjectsManagementAction extends SavedObjectsManagementAction {
  public id: string = 'copy_saved_objects_to_space';

  public euiAction = {
    name: i18n.translate('savedObjectsManagement.copyToSpace.actionTitle', {
      defaultMessage: 'Copy to space',
    }),
    description: i18n.translate('savedObjectsManagement.copyToSpace.actionDescription', {
      defaultMessage: 'Make a copy of this saved object in one or more spaces',
    }),
    icon: 'copy',
    type: 'icon',
    available: (object: SavedObjectsManagementRecord) => {
      return object.meta.namespaceType !== 'agnostic' && !object.meta.hiddenType;
    },
    onClick: (object: SavedObjectsManagementRecord) => {
      this.start(object);
    },
  };

  constructor(private readonly spacesApiUi: SpacesApiUi) {
    super();
  }

  public render = () => {
    if (!this.record) {
      throw new Error('No record available! `render()` was likely called before `start()`.');
    }

    const props: CopyToSpaceFlyoutProps = {
      onClose: this.onClose,
      savedObjectTarget: {
        type: this.record.type,
        id: this.record.id,
        namespaces: this.record.namespaces ?? [],
        title: this.record.meta.title,
        icon: this.record.meta.icon,
      },
    };

    return <Wrapper spacesApiUi={this.spacesApiUi} props={props} />;
  };

  private onClose = () => {
    this.finish();
  };
}

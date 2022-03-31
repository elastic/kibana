/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import { i18n } from '@kbn/i18n';

import type {
  ShareToSpaceFlyoutProps,
  SpacesApiUi,
} from '../../../../../../x-pack/plugins/spaces/public';
import type { SavedObjectsManagementRecord } from '../types';
import { SavedObjectsManagementAction } from '../types';

interface WrapperProps {
  spacesApiUi: SpacesApiUi;
  props: ShareToSpaceFlyoutProps;
}

const Wrapper = ({ spacesApiUi, props }: WrapperProps) => {
  const LazyComponent = useMemo(() => spacesApiUi.components.getShareToSpaceFlyout, [spacesApiUi]);

  return <LazyComponent {...props} />;
};

export class ShareToSpaceSavedObjectsManagementAction extends SavedObjectsManagementAction {
  public id: string = 'share_saved_objects_to_space';

  public euiAction = {
    name: i18n.translate('savedObjectsManagement.shareToSpace.actionTitle', {
      defaultMessage: 'Assign spaces',
    }),
    description: i18n.translate('savedObjectsManagement.shareToSpace.actionDescription', {
      defaultMessage: 'Change the spaces this object is assigned to',
    }),
    icon: 'share',
    type: 'icon',
    available: (object: SavedObjectsManagementRecord) => {
      const hasCapability =
        !this.actionContext ||
        !!this.actionContext.capabilities.savedObjectsManagement.shareIntoSpace;
      const { namespaceType, hiddenType } = object.meta;
      return namespaceType === 'multiple' && !hiddenType && hasCapability;
    },
    onClick: (object: SavedObjectsManagementRecord) => {
      this.objectsToRefresh = [];
      this.start(object);
    },
  };
  public refreshOnFinish = () => this.objectsToRefresh;

  private objectsToRefresh: Array<{ type: string; id: string }> = [];

  constructor(private readonly spacesApiUi: SpacesApiUi) {
    super();
  }

  public render = () => {
    if (!this.record) {
      throw new Error('No record available! `render()` was likely called before `start()`.');
    }

    const props: ShareToSpaceFlyoutProps = {
      savedObjectTarget: {
        type: this.record.type,
        id: this.record.id,
        namespaces: this.record.namespaces ?? [],
        title: this.record.meta.title,
        icon: this.record.meta.icon,
      },
      flyoutIcon: 'share',
      onUpdate: (updatedObjects: Array<{ type: string; id: string }>) =>
        (this.objectsToRefresh = [...updatedObjects]),
      onClose: this.onClose,
      enableCreateCopyCallout: true,
      enableCreateNewSpaceLink: true,
    };

    return <Wrapper spacesApiUi={this.spacesApiUi} props={props} />;
  };

  private onClose = () => {
    this.finish();
  };
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import type {
  ShareToSpaceFlyoutProps,
  SpaceListProps,
  SpacesApiUi,
} from '../../../../../../x-pack/plugins/spaces/public';
import type { SavedObjectsManagementRecord } from '../types';
import { SavedObjectsManagementColumn } from '../types';

interface WrapperProps {
  spacesApiUi: SpacesApiUi;
  spaceListProps: SpaceListProps;
  flyoutProps: ShareToSpaceFlyoutProps;
}

const Wrapper = ({ spacesApiUi, spaceListProps, flyoutProps }: WrapperProps) => {
  const [showFlyout, setShowFlyout] = useState(false);

  function listOnClick() {
    setShowFlyout(true);
  }

  function onClose() {
    setShowFlyout(false);
    flyoutProps.onClose?.();
  }

  const LazySpaceList = useMemo(() => spacesApiUi.components.getSpaceList, [spacesApiUi]);
  const LazyShareToSpaceFlyout = useMemo(
    () => spacesApiUi.components.getShareToSpaceFlyout,
    [spacesApiUi]
  );

  return (
    <>
      <LazySpaceList {...spaceListProps} listOnClick={listOnClick} />
      {showFlyout && <LazyShareToSpaceFlyout {...flyoutProps} onClose={onClose} />}
    </>
  );
};

export class ShareToSpaceSavedObjectsManagementColumn extends SavedObjectsManagementColumn {
  public id: string = 'share_saved_objects_to_space';

  public euiColumn = {
    field: 'namespaces',
    name: i18n.translate('savedObjectsManagement.shareToSpace.columnTitle', {
      defaultMessage: 'Shared spaces',
    }),
    description: i18n.translate('savedObjectsManagement.shareToSpace.columnDescription', {
      defaultMessage: 'The other spaces that this object is currently shared to',
    }),
    render: (namespaces: string[] | undefined, record: SavedObjectsManagementRecord) => {
      if (!namespaces) {
        return null;
      }

      const spaceListProps: SpaceListProps = {
        namespaces,
        behaviorContext: 'outside-space',
      };
      const flyoutProps: ShareToSpaceFlyoutProps = {
        savedObjectTarget: {
          type: record.type,
          id: record.id,
          namespaces: record.namespaces ?? [],
          title: record.meta.title,
          icon: record.meta.icon,
        },
        flyoutIcon: 'share',
        onUpdate: (updatedObjects: Array<{ type: string; id: string }>) =>
          (this.objectsToRefresh = [...updatedObjects]),
        onClose: this.onClose,
        enableCreateCopyCallout: true,
        enableCreateNewSpaceLink: true,
      };

      return (
        <Wrapper
          spacesApiUi={this.spacesApiUi}
          spaceListProps={spaceListProps}
          flyoutProps={flyoutProps}
        />
      );
    },
  };
  public refreshOnFinish = () => this.objectsToRefresh;

  private objectsToRefresh: Array<{ type: string; id: string }> = [];

  constructor(private readonly spacesApiUi: SpacesApiUi) {
    super();
  }

  private onClose = () => {
    this.finish();
  };
}

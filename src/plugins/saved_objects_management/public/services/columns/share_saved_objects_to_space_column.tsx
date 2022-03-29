/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import type { SavedObjectsNamespaceType } from 'src/core/public';
import { EuiIconTip } from '@elastic/eui';

import type {
  ShareToSpaceFlyoutProps,
  SpaceListProps,
  SpacesApiUi,
} from '../../../../../../x-pack/plugins/spaces/public';
import type { SavedObjectsManagementRecord } from '../types';
import { SavedObjectsManagementColumn } from '../types';

interface WrapperProps {
  objectType: string;
  objectNamespaceType: SavedObjectsNamespaceType;
  spacesApiUi: SpacesApiUi;
  spaceListProps: SpaceListProps;
  flyoutProps: ShareToSpaceFlyoutProps;
}

const columnName = i18n.translate('savedObjectsManagement.shareToSpace.columnTitle', {
  defaultMessage: 'Spaces',
});
const columnDescription = i18n.translate('savedObjectsManagement.shareToSpace.columnDescription', {
  defaultMessage: 'The spaces that this object is currently assigned to',
});
const isolatedObjectTypeTitle = i18n.translate(
  'savedObjectsManagement.shareToSpace.isolatedObjectTypeTitle',
  { defaultMessage: 'Isolated saved object' }
);
const isolatedObjectTypeContent = i18n.translate(
  'savedObjectsManagement.shareToSpace.isolatedObjectTypeContent',
  {
    defaultMessage:
      'This saved object is available in only one space, it cannot be assigned to multiple spaces.',
  }
);
const shareableSoonObjectTypeTitle = i18n.translate(
  'savedObjectsManagement.shareToSpace.shareableSoonObjectTypeTitle',
  { defaultMessage: 'Coming soon: Assign saved object to multiple spaces' }
);
const shareableSoonObjectTypeContent = i18n.translate(
  'savedObjectsManagement.shareToSpace.shareableSoonObjectTypeContent',
  {
    defaultMessage:
      'This saved object is available in only one space. In a future release, you can assign it to multiple spaces.',
  }
);
const globalObjectTypeTitle = i18n.translate(
  'savedObjectsManagement.shareToSpace.globalObjectTypeTitle',
  { defaultMessage: 'Global saved object' }
);
const globalObjectTypeContent = i18n.translate(
  'savedObjectsManagement.shareToSpace.globalObjectTypeContent',
  { defaultMessage: 'This saved object is available in all spaces.' }
);

/**
 * This is a hard-coded list that can be removed when each of these "share-capable" object types are made to be shareable.
 * Note, this list does not preclude other object types from being made shareable in the future, it just consists of the object types that
 * we are working towards making shareable in the near term.
 */
const SHAREABLE_SOON_OBJECT_TYPES = [
  'tag',
  'dashboard',
  'canvas-workpad',
  'canvas-element',
  'lens',
  'visualization',
  'map',
  'graph-workspace',
  'search',
  'query',
  'rule',
  'connector',
];

/** Three different tooltips are displayed for non-shareable objects, depending on the object type. */
function getTooltipProps(objectType: string, objectNamespaceType: SavedObjectsNamespaceType) {
  if (objectNamespaceType === 'single' || objectNamespaceType === 'multiple-isolated') {
    if (SHAREABLE_SOON_OBJECT_TYPES.includes(objectType)) {
      return { title: shareableSoonObjectTypeTitle, content: shareableSoonObjectTypeContent };
    }
    return { title: isolatedObjectTypeTitle, content: isolatedObjectTypeContent };
  } else if (objectNamespaceType === 'agnostic') {
    return { title: globalObjectTypeTitle, content: globalObjectTypeContent };
  }
  return null;
}

const Wrapper = ({
  objectType,
  objectNamespaceType,
  spacesApiUi,
  spaceListProps,
  flyoutProps,
}: WrapperProps) => {
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

  const tooltipProps = getTooltipProps(objectType, objectNamespaceType);
  if (tooltipProps) {
    return <EuiIconTip type="minus" position="left" delay="long" {...tooltipProps} />;
  }

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
    name: columnName,
    description: columnDescription,
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
          objectType={record.type}
          objectNamespaceType={record.meta.namespaceType}
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

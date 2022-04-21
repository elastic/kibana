/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useState } from 'react';

import { i18n } from '@kbn/i18n';

import type { Capabilities, SavedObjectsNamespaceType } from '@kbn/core/public';
import { EuiIconTip, EuiToolTip } from '@elastic/eui';

import type {
  ShareToSpaceFlyoutProps,
  SpaceListProps,
  SpacesApiUi,
} from '@kbn/spaces-plugin/public';
import type { SavedObjectsManagementRecord } from '../types';
import { SavedObjectsManagementColumn } from '../types';
import { SHAREABLE_SOON_OBJECT_TYPES } from './constants';

interface WrapperProps {
  objectType: string;
  objectNamespaceType: SavedObjectsNamespaceType;
  spacesApiUi: SpacesApiUi;
  capabilities: Capabilities | undefined;
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
  { defaultMessage: 'This saved object is available in all spaces and cannot be changed.' }
);

const Wrapper = ({
  objectType,
  objectNamespaceType,
  spacesApiUi,
  capabilities,
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
  const LazySpaceAvatar = useMemo(() => spacesApiUi.components.getSpaceAvatar, [spacesApiUi]);

  if (objectNamespaceType === 'single' || objectNamespaceType === 'multiple-isolated') {
    const tooltipProps = SHAREABLE_SOON_OBJECT_TYPES.includes(objectType)
      ? { title: shareableSoonObjectTypeTitle, content: shareableSoonObjectTypeContent }
      : { title: isolatedObjectTypeTitle, content: isolatedObjectTypeContent };
    return <EuiIconTip type="minus" position="left" delay="long" {...tooltipProps} />;
  } else if (objectNamespaceType === 'agnostic') {
    return (
      <EuiToolTip
        position="left"
        delay="long"
        title={globalObjectTypeTitle}
        content={globalObjectTypeContent}
      >
        <LazySpaceAvatar
          space={{ id: '*', initials: '*', color: '#D3DAE6' }}
          isDisabled={true}
          size={'s'}
        />
      </EuiToolTip>
    );
  }

  const canAssignSpaces = !capabilities || !!capabilities.savedObjectsManagement.shareIntoSpace;
  const clickProperties = canAssignSpaces
    ? { cursorStyle: 'pointer', listOnClick }
    : { cursorStyle: 'not-allowed' };
  return (
    <>
      <LazySpaceList {...spaceListProps} {...clickProperties} />
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
      const spaceListProps: SpaceListProps = {
        namespaces: namespaces ?? [],
        behaviorContext: 'outside-space',
      };
      const flyoutProps: ShareToSpaceFlyoutProps = {
        savedObjectTarget: {
          type: record.type,
          id: record.id,
          namespaces: namespaces ?? [],
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
          capabilities={this.columnContext?.capabilities}
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

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState } from 'react';

import type { Capabilities } from '@kbn/core/public';
import type { SpacesPluginStart, ShareToSpaceFlyoutProps } from '@kbn/spaces-plugin/public';

interface Props {
  spacesApi: SpacesPluginStart;
  capabilities: Capabilities | undefined;
  spaceIds: string[];
  type: string;
  noun: string;
  id: string;
  title: string;
  refresh(): void;
}

export const SpacesList: FC<Props> = ({
  spacesApi,
  capabilities,
  type,
  noun,
  spaceIds,
  id,
  title,
  refresh,
}) => {
  const [showFlyout, setShowFlyout] = useState(false);

  function onClose() {
    setShowFlyout(false);
  }

  const LazySpaceList = spacesApi.ui.components.getSpaceList;
  const LazyShareToSpaceFlyout = spacesApi.ui.components.getShareToSpaceFlyout;

  const shareToSpaceFlyoutProps: ShareToSpaceFlyoutProps = {
    savedObjectTarget: {
      type,
      namespaces: spaceIds,
      id,
      title,
      noun,
    },
    onUpdate: refresh,
    onClose,
  };

  const canAssignSpaces = !capabilities || !!capabilities.savedObjectsManagement.shareIntoSpace;
  const clickProperties = canAssignSpaces
    ? { cursorStyle: 'pointer', listOnClick: () => setShowFlyout(true) }
    : { cursorStyle: 'not-allowed' };
  return (
    <>
      <LazySpaceList
        namespaces={spaceIds}
        displayLimit={8}
        behaviorContext="outside-space"
        {...clickProperties}
      />
      {showFlyout && <LazyShareToSpaceFlyout {...shareToSpaceFlyoutProps} />}
    </>
  );
};

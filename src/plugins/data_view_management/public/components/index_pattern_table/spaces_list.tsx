/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { FC, useState } from 'react';

import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  SpacesPluginStart,
  ShareToSpaceFlyoutProps,
} from '../../../../../../x-pack/plugins/spaces/public';
import { DATA_VIEW_SAVED_OBJECT_TYPE } from '../../../../data_views/public';

interface Props {
  spacesApi: SpacesPluginStart;
  spaceIds: string[];
  id: string;
  title: string;
  refresh(): void;
}

const noun = i18n.translate('indexPatternManagement.indexPatternTable.savedObjectName', {
  defaultMessage: 'data view',
});

export const SpacesList: FC<Props> = ({ spacesApi, spaceIds, id, title, refresh }) => {
  const [showFlyout, setShowFlyout] = useState(false);

  function onClose() {
    setShowFlyout(false);
    refresh();
  }

  const LazySpaceList = spacesApi.ui.components.getSpaceList;
  const LazyShareToSpaceFlyout = spacesApi.ui.components.getShareToSpaceFlyout;

  const shareToSpaceFlyoutProps: ShareToSpaceFlyoutProps = {
    savedObjectTarget: {
      type: DATA_VIEW_SAVED_OBJECT_TYPE,
      namespaces: spaceIds,
      id,
      title,
      noun,
    },
    onClose,
  };

  return (
    <>
      <EuiButtonEmpty
        onClick={() => setShowFlyout(true)}
        style={{ height: 'auto' }}
        data-test-subj="manageSpacesButton"
      >
        <LazySpaceList namespaces={spaceIds} displayLimit={0} behaviorContext="outside-space" />
      </EuiButtonEmpty>
      {showFlyout && <LazyShareToSpaceFlyout {...shareToSpaceFlyoutProps} />}
    </>
  );
};

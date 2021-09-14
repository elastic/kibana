/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';

import { i18n } from '@kbn/i18n';

import type { SpaceListProps, SpacesApiUi } from '../../../../../../x-pack/plugins/spaces/public';
import type { SavedObjectsManagementColumn } from '../types';

interface WrapperProps {
  spacesApiUi: SpacesApiUi;
  props: SpaceListProps;
}

const Wrapper = ({ spacesApiUi, props }: WrapperProps) => {
  const LazyComponent = useMemo(() => spacesApiUi.components.getSpaceList, [spacesApiUi]);

  return <LazyComponent {...props} />;
};

export class ShareToSpaceSavedObjectsManagementColumn
  implements SavedObjectsManagementColumn<void> {
  public id: string = 'share_saved_objects_to_space';

  public euiColumn = {
    field: 'namespaces',
    name: i18n.translate('savedObjectsManagement.shareToSpace.columnTitle', {
      defaultMessage: 'Shared spaces',
    }),
    description: i18n.translate('savedObjectsManagement.shareToSpace.columnDescription', {
      defaultMessage: 'The other spaces that this object is currently shared to',
    }),
    render: (namespaces: string[] | undefined) => {
      if (!namespaces) {
        return null;
      }

      const props: SpaceListProps = {
        namespaces,
      };

      return <Wrapper spacesApiUi={this.spacesApiUi} props={props} />;
    },
  };

  constructor(private readonly spacesApiUi: SpacesApiUi) {}
}

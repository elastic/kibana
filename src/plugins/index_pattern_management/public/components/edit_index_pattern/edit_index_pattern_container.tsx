/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useEffect, useState } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import {
  ChromeDocTitle,
  NotificationsStart,
  OverlayStart,
  IUiSettingsClient,
  SavedObjectsClientContract,
} from 'src/core/public';
import { IndexPattern } from '../../../../../plugins/data/public';
import { ManagementAppMountParams } from '../../../../management/public';
import { IndexPatternManagementStart } from '../..';
import { getEditBreadcrumbs } from '../breadcrumbs';

import { EditIndexPattern } from '../edit_index_pattern';

interface EditIndexPatternContainerProps extends RouteComponentProps<{ id: string }> {
  getIndexPattern: (id: string) => Promise<IndexPattern>;
  config: IUiSettingsClient;
  services: {
    notifications: NotificationsStart;
    docTitle: ChromeDocTitle;
    overlays: OverlayStart;
    savedObjectsClient: SavedObjectsClientContract;
    setBreadcrumbs: ManagementAppMountParams['setBreadcrumbs'];
    indexPatternManagement: IndexPatternManagementStart;
    painlessDocLink: string;
  };
}

const EditIndexPatternCont: React.FC<EditIndexPatternContainerProps> = ({ ...props }) => {
  const [indexPattern, setIndexPattern] = useState<IndexPattern>();

  useEffect(() => {
    props.getIndexPattern(props.match.params.id).then((ip: IndexPattern) => {
      setIndexPattern(ip);
      props.services.setBreadcrumbs(getEditBreadcrumbs(ip));
    });
  }, [props.match.params.id, props.getIndexPattern, props]);

  if (indexPattern) {
    return (
      <EditIndexPattern
        indexPattern={indexPattern}
        services={props.services}
        config={props.config}
      />
    );
  } else {
    return <></>;
  }
};

export const EditIndexPatternContainer = withRouter(EditIndexPatternCont);

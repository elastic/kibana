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
  HttpStart,
  DocLinksStart,
  ChromeDocTitle,
  NotificationsStart,
  IUiSettingsClient,
} from 'src/core/public';

import { IndexPattern, DataPublicPluginStart } from '../../../../../../plugins/data/public';
import { CreateEditField } from './create_edit_field';

export interface CreateEditFieldContainerProps
  extends RouteComponentProps<{ id: string; fieldName: string }> {
  getIndexPattern: (id: string) => Promise<IndexPattern>;
  fieldFormatEditors: any;
  getConfig: IUiSettingsClient;
  services: {
    UiSettings: IUiSettingsClient;
    notifications: NotificationsStart;
    docTitle: ChromeDocTitle;
    http: HttpStart;
    docLinksScriptedFields: DocLinksStart['links']['scriptedFields'];
    SearchBar: DataPublicPluginStart['ui']['SearchBar'];
    toasts: NotificationsStart['toasts'];
    fieldFormats: DataPublicPluginStart['fieldFormats'];
  };
}

const CreateEditFieldCont: React.FC<CreateEditFieldContainerProps> = ({ ...props }) => {
  const [indexPattern, setIndexPattern] = useState<IndexPattern>();

  useEffect(() => {
    props.getIndexPattern(props.match.params.id).then((ip: IndexPattern) => setIndexPattern(ip));
  }, [props.match.params.id, props.getIndexPattern, props]);

  if (indexPattern) {
    return (
      <CreateEditField
        indexPattern={indexPattern}
        mode={props.match.params.fieldName ? 'edit' : 'create'}
        fieldName={props.match.params.fieldName}
        fieldFormatEditors={props.fieldFormatEditors}
        services={{
          UiSettings: props.services.UiSettings,
          http: props.services.http,
          docLinksScriptedFields: props.services.docLinksScriptedFields,
          SearchBar: props.services.SearchBar,
          toasts: props.services.toasts,
          fieldFormats: props.services.fieldFormats,
          docTitle: props.services.docTitle,
        }}
      />
    );
  } else {
    return <></>;
  }
};

// todo rename
export const CreateEditFieldContainer = withRouter(CreateEditFieldCont);

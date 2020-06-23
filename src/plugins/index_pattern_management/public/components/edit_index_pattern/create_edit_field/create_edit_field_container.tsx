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

import { IndexPattern } from '../../../../../../plugins/data/public';
import { getEditFieldBreadcrumbs, getCreateFieldBreadcrumbs } from '../../breadcrumbs';
import { useKibana } from '../../../../../../plugins/kibana_react/public';
import { IndexPatternManagmentContext } from '../../../types';
import { CreateEditField } from './create_edit_field';

export type CreateEditFieldContainerProps = RouteComponentProps<{ id: string; fieldName: string }>;

const CreateEditFieldCont: React.FC<CreateEditFieldContainerProps> = ({ ...props }) => {
  const { setBreadcrumbs, data } = useKibana<IndexPatternManagmentContext>().services;
  const [indexPattern, setIndexPattern] = useState<IndexPattern>();

  useEffect(() => {
    data.indexPatterns.get(props.match.params.id).then((ip: IndexPattern) => {
      setIndexPattern(ip);
      if (ip) {
        setBreadcrumbs(
          props.match.params.fieldName
            ? getEditFieldBreadcrumbs(ip, props.match.params.fieldName)
            : getCreateFieldBreadcrumbs(ip)
        );
      }
    });
  }, [props.match.params.id, props.match.params.fieldName, setBreadcrumbs, data.indexPatterns]);

  if (indexPattern) {
    return (
      <CreateEditField
        indexPattern={indexPattern}
        mode={props.match.params.fieldName ? 'edit' : 'create'}
        fieldName={props.match.params.fieldName}
      />
    );
  } else {
    return <></>;
  }
};

export const CreateEditFieldContainer = withRouter(CreateEditFieldCont);

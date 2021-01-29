/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';

import { IndexPattern } from '../../../../../../plugins/data/public';
import { getEditFieldBreadcrumbs, getCreateFieldBreadcrumbs } from '../../breadcrumbs';
import { useKibana } from '../../../../../../plugins/kibana_react/public';
import { IndexPatternManagmentContext } from '../../../types';
import { CreateEditField } from './create_edit_field';

export type CreateEditFieldContainerProps = RouteComponentProps<{ id: string; fieldName?: string }>;

const CreateEditFieldCont: React.FC<CreateEditFieldContainerProps> = ({ ...props }) => {
  const { setBreadcrumbs, data } = useKibana<IndexPatternManagmentContext>().services;
  const [indexPattern, setIndexPattern] = useState<IndexPattern>();
  const fieldName =
    props.match.params.fieldName && decodeURIComponent(props.match.params.fieldName);

  useEffect(() => {
    data.indexPatterns.get(props.match.params.id).then((ip: IndexPattern) => {
      setIndexPattern(ip);
      if (ip) {
        setBreadcrumbs(
          fieldName ? getEditFieldBreadcrumbs(ip, fieldName) : getCreateFieldBreadcrumbs(ip)
        );
      }
    });
  }, [props.match.params.id, fieldName, setBreadcrumbs, data.indexPatterns]);

  if (indexPattern) {
    return (
      <CreateEditField
        indexPattern={indexPattern}
        mode={fieldName ? 'edit' : 'create'}
        fieldName={fieldName}
      />
    );
  } else {
    return <></>;
  }
};

export const CreateEditFieldContainer = withRouter(CreateEditFieldCont);

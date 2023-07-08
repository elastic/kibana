/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

import type { DataView } from '@kbn/data-views-plugin/public';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { getEditFieldBreadcrumbs, getCreateFieldBreadcrumbs } from '../../breadcrumbs';
import { IndexPatternManagmentContext } from '../../../types';
import { CreateEditField } from './create_edit_field';

const CreateEditFieldCont = () => {
  const params = useParams<{ id: string; fieldName?: string }>();
  const { setBreadcrumbs, dataViews } = useKibana<IndexPatternManagmentContext>().services;
  const [indexPattern, setIndexPattern] = useState<DataView>();
  const fieldName = params.fieldName && decodeURIComponent(params.fieldName);

  useEffect(() => {
    dataViews.get(params.id).then((ip: DataView) => {
      setIndexPattern(ip);
      if (ip) {
        setBreadcrumbs(
          fieldName ? getEditFieldBreadcrumbs(ip, fieldName) : getCreateFieldBreadcrumbs(ip)
        );
      }
    });
  }, [params.id, fieldName, setBreadcrumbs, dataViews]);

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

export const CreateEditFieldContainer = React.memo(CreateEditFieldCont);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { DataView } from '../../../../../plugins/data_views/public';
import { useKibana } from '../../../../../plugins/kibana_react/public';
import { IndexPatternManagmentContext } from '../../types';
import { getEditBreadcrumbs } from '../breadcrumbs';

import { EditIndexPattern } from '../edit_index_pattern';

const EditIndexPatternCont: React.FC<RouteComponentProps<{ id: string }>> = ({ ...props }) => {
  const { dataViews, setBreadcrumbs } = useKibana<IndexPatternManagmentContext>().services;
  const [indexPattern, setIndexPattern] = useState<DataView>();

  useEffect(() => {
    dataViews.get(props.match.params.id).then((ip: DataView) => {
      setIndexPattern(ip);
      setBreadcrumbs(getEditBreadcrumbs(ip));
    });
  }, [dataViews, props.match.params.id, setBreadcrumbs]);

  if (indexPattern) {
    return <EditIndexPattern indexPattern={indexPattern} />;
  } else {
    return <></>;
  }
};

export const EditIndexPatternContainer = withRouter(EditIndexPatternCont);

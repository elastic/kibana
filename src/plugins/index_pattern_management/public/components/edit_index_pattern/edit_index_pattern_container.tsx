/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useEffect, useState } from 'react';
import { withRouter, RouteComponentProps } from 'react-router-dom';
import { IndexPattern } from '../../../../../plugins/data/public';
import { useKibana } from '../../../../../plugins/kibana_react/public';
import { IndexPatternManagmentContext } from '../../types';
import { getEditBreadcrumbs } from '../breadcrumbs';

import { EditIndexPattern } from '../edit_index_pattern';

const EditIndexPatternCont: React.FC<RouteComponentProps<{ id: string }>> = ({ ...props }) => {
  const { data, setBreadcrumbs } = useKibana<IndexPatternManagmentContext>().services;
  const [indexPattern, setIndexPattern] = useState<IndexPattern>();

  useEffect(() => {
    data.indexPatterns.get(props.match.params.id).then((ip: IndexPattern) => {
      setIndexPattern(ip);
      setBreadcrumbs(getEditBreadcrumbs(ip));
    });
  }, [data.indexPatterns, props.match.params.id, setBreadcrumbs]);

  if (indexPattern) {
    return <EditIndexPattern indexPattern={indexPattern} />;
  } else {
    return <></>;
  }
};

export const EditIndexPatternContainer = withRouter(EditIndexPatternCont);

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React, { useEffect, useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { EditIndexPattern } from '.';
import { IndexPatternManagmentContext } from '../../types';
import { getEditBreadcrumbs } from '../breadcrumbs';

const EditIndexPatternCont: React.FC<RouteComponentProps<{ id: string }>> = ({ ...props }) => {
  const { dataViews, setBreadcrumbs, notifications } =
    useKibana<IndexPatternManagmentContext>().services;
  const [error, setError] = useState<Error | undefined>();
  const [indexPattern, setIndexPattern] = useState<DataView>();

  useEffect(() => {
    dataViews
      .get(props.match.params.id)
      .then((ip: DataView) => {
        setIndexPattern(ip);
        setBreadcrumbs(getEditBreadcrumbs(ip));
      })
      .catch((err) => {
        setError(err);
      });
  }, [dataViews, props.match.params.id, setBreadcrumbs, setError]);

  if (indexPattern) {
    return <EditIndexPattern indexPattern={indexPattern} />;
  } else if (error) {
    const errorTitle = i18n.translate('indexPatternManagement.editIndexPattern.couldNotLoad', {
      defaultMessage: 'Could not load that data view',
    });
    notifications.toasts.addError(error ?? new Error(errorTitle), { title: errorTitle });
    props.history.push('/');
  }
  return <></>;
};

export const EditIndexPatternContainer = withRouter(EditIndexPatternCont);

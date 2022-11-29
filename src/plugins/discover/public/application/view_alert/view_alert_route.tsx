/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { DiscoverAppLocatorParams } from '../../../common/locator';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { getAlertUtils } from './view_alert_utils';

const DISCOVER_MAIN_ROUTE = '/';

export function ViewAlertRoute() {
  const { core, data, locator, toastNotifications } = useDiscoverServices();
  const { id } = useParams<{ id: string }>();
  const history = useHistory();

  useEffect(() => {
    const { fetchAlert, fetchSearchSource, buildLocatorParams } = getAlertUtils(
      toastNotifications,
      core,
      data
    );

    const navigateWithDiscoverState = (state: DiscoverAppLocatorParams) => locator.navigate(state);

    const navigateToDiscoverRoot = () => history.push(DISCOVER_MAIN_ROUTE);

    fetchAlert(id)
      .then(fetchSearchSource)
      .then(buildLocatorParams)
      .then(navigateWithDiscoverState)
      .catch(navigateToDiscoverRoot);
  }, [core, data, history, id, locator, toastNotifications]);

  return null;
}

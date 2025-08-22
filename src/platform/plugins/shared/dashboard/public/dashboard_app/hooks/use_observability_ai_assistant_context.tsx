/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { pick } from 'lodash';
import type { OneChatToolWithClientCallback } from '@kbn/ai-client-tools-plugin/public';
import { addToDashboardTool } from '@kbn/ai-client-tools-plugin/public';
import { dataService, observabilityAssistantService } from '../../services/kibana_services';
import type { DashboardApi } from '../../dashboard_api/types';

const NO_ACTIONS = [];

const getObservabilityToolDetails = (oneChatTool: OneChatToolWithClientCallback) => ({
  ...pick(oneChatTool, ['name', 'description', 'parameters']),
});

export function useObservabilityAIAssistantContext({
  dashboardApi,
}: {
  dashboardApi: DashboardApi | undefined;
}) {
  const [actions, setActions] = useState<any[]>(NO_ACTIONS);

  useEffect(
    function postToolClientActionsEffect() {
      let unmounted = false;
      async function getActions() {
        const postToolClientActions = await addToDashboardTool.getPostToolClientActions({
          dashboardApi,
          dataService,
        });
        if (!unmounted) {
          setActions(postToolClientActions);
        }
      }
      getActions();
      return () => {
        unmounted = true;
      };
    },
    [dashboardApi]
  );
  useEffect(() => {
    if (!observabilityAssistantService) {
      return;
    }
    const {
      service: { setScreenContext },
      createScreenContextAction,
    } = observabilityAssistantService;

    return setScreenContext({
      screenDescription: addToDashboardTool.screenDescription,
      actions: actions.map((action) =>
        createScreenContextAction(getObservabilityToolDetails(addToDashboardTool), action)
      ),
    });
  }, [actions]);
}

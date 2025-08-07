/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getESQLQueryColumns } from '@kbn/esql-utils';
import {
  LensConfigBuilder,
  LensDataset,
  type LensConfig,
  type LensGaugeConfig,
  type LensHeatmapConfig,
  type LensMetricConfig,
  type LensMosaicConfig,
  type LensPieConfig,
  type LensRegionMapConfig,
  type LensTableConfig,
  type LensTagCloudConfig,
  type LensTreeMapConfig,
  type LensXYConfig,
} from '@kbn/lens-embeddable-utils/config_builder';
import { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { z } from '@kbn/zod';
import { pick } from 'lodash';
import {
  EuiFlyoutHeader,
  EuiTextArea,
  EuiTitle,
  EuiFlyoutBody,
  EuiButton,
  EuiSpacer,
} from '@elastic/eui';
import { openLazyFlyout } from '@kbn/presentation-util';
import { i18n } from '@kbn/i18n';
import { correctCommonEsqlMistakes } from '@kbn/inference-plugin/public';

import {
  usePostToolClientActions,
  type OneChatToolWithClientCallback,
} from '@kbn/ai-client-tools-plugin/public';
import { dataService, observabilityAssistantService } from '../../services/kibana_services';
import { DashboardApi } from '../../dashboard_api/types';
// import { coreServices, inferenceService } from '../../services/kibana_services';
import { convertSchemaToObservabilityParameters } from './schema_adapters';
import { addToDashboardTool } from '../poc_add_lens/add_to_dashboard_tool';

const NO_ACTIONS = [];

const getObservabilityToolDetails = (oneChatTool: OneChatToolWithClientCallback) => ({
  ...pick(oneChatTool, ['name', 'description']),
  parameters: convertSchemaToObservabilityParameters(oneChatTool.schema),
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

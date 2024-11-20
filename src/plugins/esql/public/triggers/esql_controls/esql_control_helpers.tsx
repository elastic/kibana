/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { type EsqlControlType, ESQLControlsFlyout } from '@kbn/esql-controls';
import type { CoreStart } from '@kbn/core/public';
import { toMountPoint } from '@kbn/react-kibana-mount';
import type { PresentationContainer } from '@kbn/presentation-containers';

interface Context {
  queryString: string;
  core: CoreStart;
  controlType: EsqlControlType;
  dashboardApi: PresentationContainer;
}

export async function isActionCompatible(queryString: string) {
  // we want to make sure that the current query is an ES|QL query
  return isOfAggregateQueryType({ esql: queryString });
}

export async function executeAction({ queryString, core, controlType, dashboardApi }: Context) {
  const isCompatibleAction = await isActionCompatible(queryString);
  if (!isCompatibleAction) {
    throw new IncompatibleActionError();
  }

  const handle = core.overlays.openFlyout(
    toMountPoint(
      React.cloneElement(
        <ESQLControlsFlyout
          queryString={queryString}
          controlType={controlType}
          closeFlyout={() => {
            handle.close();
          }}
          dashboardApi={dashboardApi}
        />,
        {
          closeFlyout: () => {
            handle.close();
          },
        }
      ),
      core
    ),
    {
      size: 's',
      'data-test-subj': 'create_esql_control_flyout',
      type: 'push',
      paddingSize: 'm',
      hideCloseButton: true,
      onClose: (overlayRef) => {
        overlayRef.close();
      },
      outsideClickCloses: true,
    }
  );
}

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useState } from 'react';
import type { DataView } from '@kbn/data-plugin/common';
import type { AggregateQuery } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { AppMenuItemSecondary } from '@kbn/discover-utils';
import { AppMenuActionId, AppMenuActionType } from '@kbn/discover-utils';
import { ESQLRuleFormFlyout } from '@kbn/esql-rule-form/flyout';
import { type Observable, type BehaviorSubject, filter, map, pairwise, startWith } from 'rxjs';
import type { DiscoverStateContainer } from '../../../state_management/discover_state';
import type { AppMenuDiscoverParams } from './types';
import type { DiscoverServices } from '../../../../../build_services';
import type { DiscoverAppState } from '../../../state_management/redux';
import type { DataMainMsg } from '../../../state_management/discover_data_state_container';

export function CreateESQLRuleFlyout({
  discoverParams,
  services,
  stateContainer,
}: {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  stateContainer: DiscoverStateContainer;
}) {
  const { dataView } = discoverParams;
  const timeField = getTimeField(dataView);
  const [query, setQuery] = useState<string>(
    (stateContainer.getCurrentTab().appState.query as AggregateQuery)?.esql || ''
  );

  const { http, dataViews, notifications } = services;
  const [showFlyout, setShowFlyout] = useState(true);
  const [queryError, setQueryError] = useState<Error | undefined>(undefined);

  useEffect(() => {
    const querySubscription = createAppStateObservable(stateContainer.appState$).subscribe(
      (changes) => {
        if (changes.query) {
          setQuery((changes.query as AggregateQuery)?.esql || '');
        }
      }
    );
    const queryErrorSubscription = createDataStateObservable(
      stateContainer.dataState.data$.main$
    ).subscribe((changes) => {
      setQueryError(changes.error);
    });

    return () => {
      querySubscription.unsubscribe();
      queryErrorSubscription.unsubscribe();
    };
  }, [stateContainer.appState$, stateContainer.dataState.data$.main$]);

  return showFlyout ? (
    <ESQLRuleFormFlyout
      defaultTimeField={timeField}
      services={{
        http,
        dataViews,
        notifications,
      }}
      query={query}
      onClose={() => setShowFlyout(false)}
      isQueryInvalid={Boolean(queryError)}
    />
  ) : null;
}

export const getCreateRuleMenuItem = ({
  discoverParams,
  services,
  stateContainer,
}: {
  discoverParams: AppMenuDiscoverParams;
  services: DiscoverServices;
  stateContainer: DiscoverStateContainer;
}): AppMenuItemSecondary => {
  return {
    id: AppMenuActionId.esqlRule,
    type: AppMenuActionType.secondary,
    label: i18n.translate('discover.localMenu.ruleTitle', {
      defaultMessage: 'Create Rule',
    }),
    description: i18n.translate('discover.localMenu.ruleDescription', {
      defaultMessage: 'Create Rule',
    }),
    controlProps: {
      label: i18n.translate('discover.localMenu.ruleTitle', {
        defaultMessage: 'Create Rule',
      }),
      description: i18n.translate('discover.localMenu.ruleDescription', {
        defaultMessage: 'Open flyout to create rule',
      }),
      testId: 'openRuleFlyoutButton',
      onClick: async () => {
        return (
          <CreateESQLRuleFlyout
            discoverParams={discoverParams}
            services={services}
            stateContainer={stateContainer}
          />
        );
      },
    },
    testId: 'discoverESQLRuleButton',
  };
};

function getTimeField(dataView: DataView | undefined) {
  const dateFields = dataView?.fields.getByType('date');
  return dataView?.timeFieldName || dateFields?.[0]?.name;
}

const createAppStateObservable = (state$: Observable<DiscoverAppState>) => {
  return state$.pipe(
    startWith(undefined),
    pairwise(),
    map(([prev, curr]) => {
      const changes: Partial<DiscoverAppState> = {};
      if (!curr) {
        return changes;
      }

      if (prev?.query !== curr.query) {
        changes.query = curr.query;
      }

      return changes;
    }),
    filter((changes) => Object.keys(changes).length > 0)
  );
};

const createDataStateObservable = (
  state$: BehaviorSubject<DataMainMsg>
): Observable<{ error?: Error }> => {
  return state$.pipe(
    startWith(undefined),
    pairwise(),
    map(([prev, curr]) => {
      const changes: { error?: Error } = {};

      if (!curr) {
        return changes;
      }

      if (prev?.error !== curr.error) {
        changes.error = curr.error;
      }

      return changes;
    }),
    filter((changes) => Object.keys(changes).length > 0)
  );
};

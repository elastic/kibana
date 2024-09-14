/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge, EuiFlyout } from '@elastic/eui';
import { getFieldValue } from '@kbn/discover-utils';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { RootProfileProvider, SolutionType } from '../../../profiles';

interface ExampleRootProfileContext {
  count$: BehaviorSubject<number>;
  selectedAgentName$: BehaviorSubject<string | undefined>;
}

export const createExampleRootProfileProvider =
  (): RootProfileProvider<ExampleRootProfileContext> => ({
    profileId: 'example-root-profile',
    isExperimental: true,
    profile: {
      getRenderAppWrapper: (PrevWrapper, params) => {
        return function AppWrapper({ children }) {
          const selectedAgentName = useObservable(params.context.selectedAgentName$);

          return (
            <PrevWrapper>
              {children}
              {selectedAgentName && (
                <EuiFlyout
                  type="push"
                  onClose={() => {
                    params.context.selectedAgentName$.next(undefined);
                  }}
                >
                  <div>agent name: {selectedAgentName}</div>
                </EuiFlyout>
              )}
            </PrevWrapper>
          );
        };
      },
      getCellRenderers:
        (prev, { context: { count$, selectedAgentName$ } }) =>
        () => ({
          ...prev(),
          '@timestamp': function Timestamp(props) {
            const timestamp = getFieldValue(props.row, '@timestamp');
            const count = useObservable(count$, 0);

            return (
              <>
                <div>
                  <EuiBadge
                    color="hollow"
                    title={timestamp}
                    onClick={() => {
                      count$.next(count + 1);
                    }}
                    onClickAriaLabel="Increment count"
                    data-test-subj="exampleRootProfileTimestamp"
                  >
                    {timestamp}
                  </EuiBadge>
                </div>
                <div>Count: {count}</div>
              </>
            );
          },
          'agent.name': function AgentName(props) {
            const agentName = getFieldValue(props.row, 'agent.name');

            return (
              <EuiBadge
                color="hollow"
                title={agentName}
                onClick={() => {
                  selectedAgentName$.next(agentName + ` (${props.row.id})`);
                }}
                onClickAriaLabel="Select agent name"
                data-test-subj="exampleRootProfileAgentName"
              >
                {agentName}
              </EuiBadge>
            );
          },
        }),
    },
    resolve: (params) => {
      if (params.solutionNavId != null) {
        return { isMatch: false };
      }

      return {
        isMatch: true,
        context: {
          solutionType: SolutionType.Default,
          count$: new BehaviorSubject(0),
          selectedAgentName$: new BehaviorSubject<string | undefined>(undefined),
        },
      };
    },
  });

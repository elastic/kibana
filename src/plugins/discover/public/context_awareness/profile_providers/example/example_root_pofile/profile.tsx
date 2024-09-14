/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiBadge } from '@elastic/eui';
import { getFieldValue } from '@kbn/discover-utils';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import { RootProfileProvider, SolutionType } from '../../../profiles';

interface ExampleRootProfileContext {
  count$: BehaviorSubject<number>;
}

export const createExampleRootProfileProvider =
  (): RootProfileProvider<ExampleRootProfileContext> => ({
    profileId: 'example-root-profile',
    isExperimental: true,
    profile: {
      getCellRenderers:
        (prev, { count$ }) =>
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
        }),
    },
    resolve: (params) => {
      if (params.solutionNavId != null) {
        return { isMatch: false };
      }

      return {
        isMatch: true,
        context: { solutionType: SolutionType.Default, count$: new BehaviorSubject(0) },
      };
    },
  });

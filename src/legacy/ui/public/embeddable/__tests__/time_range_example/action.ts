/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { Action } from 'ui/embeddable/actions';
import { ExecuteOptions } from 'ui/embeddable/actions/action';
import { TimeRange } from 'ui/visualize';
import { actionRegistry } from '../../actions';
import { Embeddable } from '../../embeddables';

interface ActionContext {
  timeRange?: TimeRange;
  inherit: boolean;
}

interface ContainerContext {
  timeRange: TimeRange;
}

const MIGRATOR_ID = 'timeRangeModifier';
export const TIME_RANGE_ACTION_ID = 'timerrange';

interface TimeRangeActionConfiguration extends ExecuteOptions<ContainerContext, ActionContext> {
  embeddable: Embeddable<ContainerContext, any>;
  containerContext: ContainerContext;
  actionContext: ActionContext;
}

export class TimeOverrideAction extends Action<ContainerContext, ActionContext> {
  constructor() {
    super({ id: TIME_RANGE_ACTION_ID });
  }
  public isCompatable({
    embeddable,
    containerContext,
  }: {
    embeddable: Embeddable<ContainerContext, any>;
    containerContext: ContainerContext;
  }) {
    return Promise.resolve(true);
  }

  public execute({ embeddable, actionContext }: TimeRangeActionConfiguration) {
    embeddable.removeInputMigrator(MIGRATOR_ID);

    if (!actionContext.inherit && actionContext.timeRange) {
      embeddable.addInputMigrator({
        id: MIGRATOR_ID,
        migrate: (input: ContainerContext) => {
          return actionContext.timeRange
            ? {
                ...input,
                timeRange: actionContext.timeRange,
              }
            : input;
        },
      });
    }
  }
}

actionRegistry.registerAction(new TimeOverrideAction());

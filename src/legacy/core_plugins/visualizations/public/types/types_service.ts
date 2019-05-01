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

// @ts-ignore
import { defaultFeedbackMessage } from 'ui/vis/default_feedback_message';
import { getUpdateStatus, Status } from 'ui/vis/update_status';
// @ts-ignore
import { updateOldState } from 'ui/vis/vis_update_state';
// @ts-ignore
import { VisProvider } from 'ui/vis/index.js';
// @ts-ignore
import { VisFactoryProvider } from 'ui/vis/vis_factory';
import { VisTypesRegistryProvider } from 'ui/registry/vis_types';

/**
 * Vis Types Service
 *
 * @internal
 */
export class TypesService {
  public setup() {
    return {
      VisProvider,
      VisFactoryProvider,
      VisTypesRegistryProvider,
      defaultFeedbackMessage, // make default in base vis type, or move?
      updateOldState, // convert to saved object migration?
      updateStatus: {
        getUpdateStatus,
        Status,
      },
    };
  }

  public stop() {
    // nothing to do here yet
  }
}

/** @public */
export type TypesSetup = ReturnType<TypesService['setup']>;

/** @public types */
export { Vis, VisParams, VisProvider, VisState } from 'ui/vis/vis';

/** @public types */
export { VisualizationController, VisType } from 'ui/vis/vis_types/vis_type';

/** @public types */
export { VisTypesRegistry } from 'ui/registry/vis_types';

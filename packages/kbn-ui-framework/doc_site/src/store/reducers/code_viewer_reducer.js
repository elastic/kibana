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

import { LOCATION_CHANGE } from 'react-router-redux';

import ActionTypes from '../../actions/action_types';

const defaultState = {
  isOpen: false,
  codesBySlug: {},
  source: undefined,
  title: undefined,
};

export default function codeViewerReducer(state = defaultState, action) {
  switch (action.type) {
    case ActionTypes.OPEN_CODE_VIEWER: {
      const { source, title } = action;

      if (state.code === source) {
        // If we are opening the existing code, then close the viewer.
        return {
          ...state,
          isOpen: false,
          source: undefined,
          title: undefined,
        };
      }

      return {
        ...state,
        isOpen: true,
        source,
        title,
      };
    }

    case LOCATION_CHANGE: // Close Code Viewer when we navigate somewhere.
    case ActionTypes.CLOSE_CODE_VIEWER: {
      return {
        ...state,
        isOpen: false,
        source: undefined,
      };
    }

    default:
      break;
  }

  return state;
}

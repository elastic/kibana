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

import * as React from 'react';
import { UiComponent } from '../../../kibana_utils/public';

const { createElement: h, useRef, useEffect } = React;

export const uiToReactComponent = <Props extends object>(
  uiComp: UiComponent<Props>
): React.ComponentType<Props> => {
  const reactComp: React.FC<Props> = props => {
    const ref = useRef<HTMLDivElement>();
    useEffect(() => {
      if (ref.current) {
        uiComp.render(ref.current, props);
      }
      return () => {
        if (uiComp.unmount) uiComp.unmount();
      };
    });

    return h('div', { ref });
  };

  return reactComp;
};

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

import React from 'react';

// @ts-ignore
import { EuiProgress, EuiIcon, EuiToolTip } from '@elastic/eui';

interface Props {
  maxProgressValue: number;
}

export function ConsoleProgressBar(props: Props) {
  return (
    <div>
      <EuiToolTip position="top" content={<p>Query run length: 1.34s</p>}>
        <EuiIcon type="clock" />
      </EuiToolTip>
      <EuiProgress
        value="1"
        max={props.maxProgressValue}
        size="xs"
        color="accent"
        position="absolute"
      />
    </div>
  );
}

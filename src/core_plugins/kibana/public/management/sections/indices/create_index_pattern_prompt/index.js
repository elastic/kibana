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

import React, { Fragment } from 'react';
import {
    EuiEmptyPrompt,
    EuiButton
} from '@elastic/eui';

export function RenderCreateIndexPatternPrompt() {
    // return (<div>Index Pattern Prompt Graphics TBD</div>);
    return (<EuiEmptyPrompt
        iconType="editorStrike"
        title={<Fragment><h2>Create your first index pattern</h2> <h3>hi hi hi</h3></Fragment>}
        body={
            <Fragment>
                <p>
                    Index patterns allow you to bucket disparate data sources together so their shared fields may be queried in Kibana.
              </p>
                <p>You&rsquo;ll need spice to rule Arrakis, young Atreides.</p>
            </Fragment>
        }
        actions={<EuiButton color="primary" fill>Harvest spice</EuiButton>}
    />);
}
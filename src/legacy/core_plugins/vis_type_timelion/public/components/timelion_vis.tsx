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

import { IUiSettingsClient } from 'kibana/public';
import { Vis } from 'ui/vis';
import { ChartComponent } from './chart';
import { VisParams } from '../timelion_vis_fn';
import { TimelionSuccessResponse } from '../helpers/timelion_request_handler';

interface TimelionVisComponentProp {
  config: IUiSettingsClient;
  renderComplete: () => void;
  updateStatus: object;
  vis: Vis;
  visData: TimelionSuccessResponse;
  visParams: VisParams;
}

function TimelionVisComponent(props: TimelionVisComponentProp) {
  return (
    <div className="timVis">
      <ChartComponent
        seriesList={props.visData.sheet[0]}
        renderComplete={props.renderComplete}
        className="timChart"
        interval={props.vis.getState().params.interval}
      />
    </div>
  );
}

export { TimelionVisComponent };

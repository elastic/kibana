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

import { TooltipProps, TooltipType, TooltipValueFormatter, TickFormatter } from '@elastic/charts';

import { VisParams } from '../types';

export function getTooltip(
  { addTooltip, detailedTooltip }: VisParams,
  formatter?: TickFormatter
): TooltipProps {
  // let type: TooltipType = TooltipType.None;
  // if (addTooltip) {
  //   if (detailedTooltip) {
  //     type = TooltipType.Follow;
  //   } else {
  //     type = TooltipType.VerticalCursor;
  //   }
  // }
  const type = addTooltip ? TooltipType.VerticalCursor : TooltipType.None;
  const headerFormatter: TooltipValueFormatter | undefined = formatter
    ? ({ value }) => formatter(value)
    : undefined;

  return {
    type,
    headerFormatter,
  };
}

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

import { EuiIcon, IconType } from '@elastic/eui';
import React from 'react';

interface VisTypeIconProps {
  icon?: IconType;
  image?: string;
}

/**
 * This renders the icon for a specific visualization type.
 * This currently checks the following:
 * - If image is set, use that as the `src` of an image
 * - Otherwise use the icon as an EuiIcon or the 'empty' icon if that's not set
 */
export const VisTypeIcon = ({ icon, image }: VisTypeIconProps) => {
  return (
    <React.Fragment>
      {image && <img src={image} alt="" className="visNewVisDialog__typeImage" />}
      {!image && <EuiIcon type={icon || 'empty'} size="l" color="secondary" />}
    </React.Fragment>
  );
};

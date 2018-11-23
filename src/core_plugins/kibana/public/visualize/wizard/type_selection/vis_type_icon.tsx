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

import { EuiIcon } from '@elastic/eui';
import classnames from 'classnames';
import React from 'react';
import { VisType } from 'ui/vis';

interface VisTypeIconProps {
  visType: VisType;
}

/**
 * This renders the icon for a specific visualization type.
 * This currently checks the following:
 * - If visType.image is set, use that as the `src` of an image
 * - If legacyIcon is set, use that as a classname for a span with kuiIcon (to be removed in 7.0)
 * - Otherwise use the visType.icon as an EuiIcon or the 'empty' icon if that's not set
 */
export const VisTypeIcon = ({ visType }: VisTypeIconProps) => {
  const legacyIconClass = classnames(
    'kuiIcon',
    'visNewVisDialog__typeLegacyIcon',
    visType.legacyIcon
  );
  return (
    <React.Fragment>
      {visType.image && (
        <img src={visType.image} aria-hidden="true" className="visNewVisDialog__typeImage" />
      )}
      {!visType.image && visType.legacyIcon && <span className={legacyIconClass} />}
      {!visType.image &&
        !visType.legacyIcon && (
          <EuiIcon type={visType.icon || 'empty'} size="l" color="secondary" aria-hidden="true" />
        )}
    </React.Fragment>
  );
};

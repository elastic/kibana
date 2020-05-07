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

import PropTypes from 'prop-types';
import React from 'react';
import classNames from 'classnames';

import { KuiPagerButtonGroup } from './pager_button_group';

export function KuiPager({
  className,
  startNumber,
  endNumber,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onNextPage,
  onPreviousPage,
  ...rest
}) {
  const classes = classNames('kuiPager', className);
  return (
    <div className={classes} {...rest}>
      <div className="kuiPagerText">
        {startNumber}&ndash;{endNumber} of {totalItems}
      </div>
      {startNumber === 1 && endNumber === totalItems ? null : (
        <KuiPagerButtonGroup
          hasNext={hasNextPage}
          hasPrevious={hasPreviousPage}
          onNext={onNextPage}
          onPrevious={onPreviousPage}
        />
      )}
    </div>
  );
}

KuiPager.propTypes = {
  startNumber: PropTypes.number.isRequired,
  endNumber: PropTypes.number.isRequired,
  totalItems: PropTypes.number.isRequired,
  hasPreviousPage: PropTypes.bool.isRequired,
  hasNextPage: PropTypes.bool.isRequired,
  onNextPage: PropTypes.func.isRequired,
  onPreviousPage: PropTypes.func.isRequired,
  className: PropTypes.string,
};

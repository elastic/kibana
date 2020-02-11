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

import React, { FunctionComponent } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';

interface Props {
  isOpen: boolean;
  children: React.ReactNode;

  onVerticalMarkerClick?: () => void;
}

const VerticalMarker: FunctionComponent<{ onClick: () => void; isOpen: boolean }> = ({
  onClick,
  isOpen,
}) => (
  <EuiFlexGroup alignItems="center" onClick={onClick} gutterSize="none" justifyContent="center">
    <EuiFlexItem grow={false}>
      <EuiIcon type={isOpen ? 'arrowLeft' : 'arrowRight'} />
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const VerticalDrawer: FunctionComponent<Props> = ({
  isOpen,
  children,
  onVerticalMarkerClick = () => {},
}) => {
  if (isOpen) {
    return (
      <EuiFlexGroup gutterSize="none" direction="row">
        <EuiFlexItem>{children}</EuiFlexItem>
        <EuiFlexItem>
          <VerticalMarker isOpen onClick={onVerticalMarkerClick} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  return <VerticalMarker isOpen={false} onClick={onVerticalMarkerClick} />;
};

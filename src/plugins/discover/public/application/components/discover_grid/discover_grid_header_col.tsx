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
import { EuiIcon, EuiListGroup, EuiPopover } from '@elastic/eui';
import React, { useState } from 'react';

export const DiscoverGridHeader = ({ title, listItems }: any) => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const usedListItems = listItems.map((listItem: any) => {
    return {
      ...listItem,
      onClick: () => {
        setIsPopoverOpen(false);
        listItem.onClick();
      },
    };
  });
  return (
    <div className="euiDataGridHeader">
      <div className="euiDataGridHeaderCell__content">{title}</div>
      <EuiPopover
        id={`${title}_popover`}
        className="euiDataGridHeaderCell__popover"
        panelPaddingSize="none"
        anchorPosition="downRight"
        isOpen={isPopoverOpen}
        closePopover={() => setIsPopoverOpen(false)}
        button={
          <button onClick={() => setIsPopoverOpen(true)}>
            <EuiIcon type="arrowDown" size="s" />
          </button>
        }
      >
        <div>
          <EuiListGroup listItems={usedListItems} gutterSize="none" />
        </div>
      </EuiPopover>
    </div>
  );
};

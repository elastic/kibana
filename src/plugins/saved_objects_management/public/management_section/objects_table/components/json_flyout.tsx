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
import {
  EuiTitle,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIcon,
  EuiToolTip,
  EuiCodeBlock,
} from '@elastic/eui';
import { IBasePath } from 'src/core/public';
import { SavedObjectsClientContract, SavedObject } from 'src/core/public';
import useMountedState from 'react-use/lib/useMountedState';
import { getDefaultTitle, getSavedObjectLabel } from '../../../lib';

export interface JsonFlyoutProps {
  basePath: IBasePath;
  savedObject: SavedObject<unknown>;
  savedObjectsClient: SavedObjectsClientContract;
  close: () => void;
}

export const JsonFlyout: React.FC<JsonFlyoutProps> = ({
  close,
  savedObject,
  savedObjectsClient,
}) => {
  const [so, setSo] = React.useState<SavedObject<unknown>>(savedObject);
  const isMounted = useMountedState();
  React.useEffect(() => {
    savedObjectsClient.get<unknown>(savedObject.type, savedObject.id).then((newSo) => {
      if (!isMounted()) return;
      setSo(newSo);
    });
  }, [savedObjectsClient, savedObject, isMounted]);

  return (
    <EuiFlyout onClose={close}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            <EuiToolTip position="top" content={getSavedObjectLabel(savedObject.type)}>
              <EuiIcon
                aria-label={getSavedObjectLabel(savedObject.type)}
                size="m"
                type={savedObject.meta.icon || 'apps'}
              />
            </EuiToolTip>
            &nbsp;&nbsp;
            {savedObject.meta.title || getDefaultTitle(savedObject)}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        <EuiCodeBlock language="js" fontSize="m" paddingSize="m" isCopyable>
          {JSON.stringify(
            {
              id: so.id,
              type: so.type,
              attributes: so.attributes,
            },
            null,
            4
          )}
        </EuiCodeBlock>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

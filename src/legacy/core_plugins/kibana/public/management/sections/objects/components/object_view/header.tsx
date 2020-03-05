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
import { FormattedMessage } from '@kbn/i18n/react';
interface HeaderProps {
  canEdit: boolean;
  canDelete: boolean;
  canViewInApp: boolean;
  type: string;
  viewUrl: string;
  onDeleteClick: () => void;
}

export const Header = ({
  canEdit,
  canDelete,
  canViewInApp,
  type,
  viewUrl,
  onDeleteClick,
}: HeaderProps) => {
  return (
    <div className="kuiViewContentItem kuiBar kuiVerticalRhythm">
      <div className="kuiBarSection">
        <h1 className="kuiTitle">
          {canEdit ? (
            <FormattedMessage
              id="kbn.management.objects.view.editItemTitle"
              defaultMessage="Edit {title}"
              values={{
                title: type,
              }}
            />
          ) : (
            <FormattedMessage
              id="kbn.management.objects.view.viewItemTitle"
              defaultMessage="View {title}"
              values={{
                title: type,
              }}
            />
          )}
        </h1>
      </div>

      <div className="kuiBarSection">
        {canViewInApp && (
          <a className="kuiButton kuiButton--basic kuiButton--iconText" href={viewUrl}>
            <span className="kuiButton__inner">
              <span className="kuiButton__icon kuiIcon fa-eye" />
              <span>
                <FormattedMessage
                  id="kbn.management.objects.view.viewItemButtonLabel"
                  defaultMessage="View {title}"
                  values={{
                    title: type,
                  }}
                />
              </span>
            </span>
          </a>
        )}

        {canDelete && (
          <button
            className="kuiButton kuiButton--danger kuiButton--iconText"
            onClick={() => onDeleteClick()}
            data-test-subj="savedObjectEditDelete"
          >
            <span className="kuiButton__inner">
              <span className="kuiButton__icon kuiIcon fa-trash-o" />
              <span>
                <FormattedMessage
                  id="kbn.management.objects.view.deleteItemButtonLabel"
                  defaultMessage="Delete {title}"
                  values={{
                    title: type,
                  }}
                />
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

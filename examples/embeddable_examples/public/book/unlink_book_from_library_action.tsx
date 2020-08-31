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

import { i18n } from '@kbn/i18n';
import { createAction, IncompatibleActionError } from '../../../../src/plugins/ui_actions/public';
import { BookEmbeddable, BOOK_EMBEDDABLE } from './book_embeddable';
import { ViewMode, isReferenceOrValueEmbeddable } from '../../../../src/plugins/embeddable/public';
import { DASHBOARD_CONTAINER_TYPE } from '../../../../src/plugins/dashboard/public';

interface ActionContext {
  embeddable: BookEmbeddable;
}

export const ACTION_UNLINK_BOOK_FROM_LIBRARY = 'ACTION_UNLINK_BOOK_FROM_LIBRARY';

export const createUnlinkBookFromLibraryAction = () =>
  createAction({
    getDisplayName: () =>
      i18n.translate('embeddableExamples.book.unlinkFromLibrary', {
        defaultMessage: 'Unlink Book from Library Item',
      }),
    type: ACTION_UNLINK_BOOK_FROM_LIBRARY,
    order: 100,
    getIconType: () => 'folderExclamation',
    isCompatible: async ({ embeddable }: ActionContext) => {
      return (
        embeddable.type === BOOK_EMBEDDABLE &&
        embeddable.getInput().viewMode === ViewMode.EDIT &&
        embeddable.getRoot().isContainer &&
        embeddable.getRoot().type !== DASHBOARD_CONTAINER_TYPE &&
        isReferenceOrValueEmbeddable(embeddable) &&
        embeddable.inputIsRefType(embeddable.getInput())
      );
    },
    execute: async ({ embeddable }: ActionContext) => {
      if (!isReferenceOrValueEmbeddable(embeddable)) {
        throw new IncompatibleActionError();
      }
      const newInput = await embeddable.getInputAsValueType();
      embeddable.updateInput(newInput);
    },
  });

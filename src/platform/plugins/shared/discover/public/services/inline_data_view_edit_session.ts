/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as uuidv4 } from 'uuid';
import type { DataView, DataViewsContract } from '@kbn/data-views-plugin/public';
import { isInlineDataView } from '../../common/session/inline_data_view';

export interface InlineDataViewEditOptions {
  updatedFieldNames?: readonly string[];
}

export interface InlineDataViewEditSession {
  readonly draft: Promise<DataView>;
  commit: (options?: InlineDataViewEditOptions) => Promise<DataView>;
  dispose: () => void;
}

/** Owns one edit's draft until cancellation or completion, never evicting a retained instance. */
export const createInlineDataViewEditSession = ({
  source,
  dataViews,
  finalize,
}: {
  source: DataView;
  dataViews: Pick<DataViewsContract, 'create' | 'clearInstanceCache'>;
  finalize: (dataView: DataView) => Promise<DataView>;
}): InlineDataViewEditSession => {
  let disposed = false;
  let draftId: string | undefined;
  let retained: DataView | undefined;
  let committing: Promise<DataView> | undefined;

  const release = () => {
    if (draftId && draftId !== retained?.id) {
      dataViews.clearInstanceCache(draftId);
    }

    draftId = undefined;
  };

  const prepareDraft = async (): Promise<DataView> => {
    if (source.isPersisted()) {
      return source;
    }

    // An explicit ID lets create cache the draft promise before returning.
    draftId = uuidv4();

    try {
      return await dataViews.create({ ...source.toSpec(), id: draftId }, true);
    } catch (error) {
      release();
      throw error;
    }
  };

  const draft = prepareDraft();

  const commitDraft = async (options: InlineDataViewEditOptions): Promise<DataView> => {
    try {
      const edited = await draft;
      retained = await finalize(edited);
      const { updatedFieldNames } = options;

      if (isInlineDataView(edited) && updatedFieldNames?.length) {
        const fieldAttrs = edited.getFieldAttrs();

        for (const name of updatedFieldNames) {
          retained.setFieldCount(name, fieldAttrs.get(name)?.count);
        }
      }

      return retained;
    } finally {
      disposed = true;
      release();
    }
  };

  const commit = (options: InlineDataViewEditOptions = {}): Promise<DataView> => {
    if (committing) {
      return committing;
    }

    if (disposed) {
      return Promise.reject(new Error('Cannot commit a disposed data view edit'));
    }

    committing = commitDraft(options);
    return committing;
  };

  const dispose = () => {
    disposed = true;
    // A commit already in flight still needs the draft until finalization completes.
    if (!committing) {
      release();
    }
  };

  return { draft, commit, dispose };
};

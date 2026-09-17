/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiImage, EuiSkeletonRectangle, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Comment, CommentSnapshot } from '../types';
import { useComments } from './comments_context';

/** Tallest thumbnail; the width follows the screenshot's aspect ratio so nothing is cropped. */
const THUMBNAIL_MAX_HEIGHT = 160;

export interface SnapshotState {
  src: string | null;
  loading: boolean;
  failed: boolean;
}

/** Loads the comment's screenshot once `enabled` and keeps it for the component's lifetime. */
export const useSnapshot = (commentId: string, enabled: boolean): SnapshotState => {
  const { services } = useComments();
  const [state, setState] = useState<SnapshotState>({ src: null, loading: false, failed: false });
  const started = useRef(false);

  useEffect(() => {
    if (!enabled || started.current) {
      return;
    }
    started.current = true;
    setState({ src: null, loading: true, failed: false });
    services.api.getSnapshot(commentId).then(
      (snapshot) =>
        setState({
          src: snapshot?.image ? `data:${snapshot.mimeType};base64,${snapshot.image}` : null,
          loading: false,
          failed: !snapshot?.image,
        }),
      () => setState({ src: null, loading: false, failed: true })
    );
  }, [enabled, commentId, services]);

  return state;
};

/** Thumbnail of the comment's screenshot, sized from the stored dimensions before the image arrives; a click opens it full screen. */
export const SnapshotImage = ({
  comment,
  snapshot,
  state,
}: {
  comment: Comment;
  snapshot: CommentSnapshot;
  state: SnapshotState;
}) => {
  const controller = useComments();
  const { src, failed } = state;
  const alt = i18n.translate('devComments.snapshot.alt', {
    defaultMessage: 'Screenshot of the UI around the comment by {author}',
    values: { author: comment.author.displayName },
  });

  // If the thread closes while the full-screen view is open, the view goes with it.
  useEffect(() => () => controller.setOverlayOpen(false), [controller]);

  if (failed) {
    return (
      <EuiText size="xs" color="subdued">
        {i18n.translate('devComments.snapshot.unavailable', {
          defaultMessage: 'The screenshot could not be loaded.',
        })}
      </EuiText>
    );
  }

  return (
    <div
      css={css`
        display: flex;
        width: min(100%, ${(THUMBNAIL_MAX_HEIGHT * snapshot.width) / snapshot.height}px);
        aspect-ratio: ${snapshot.width} / ${snapshot.height};
      `}
      data-test-subj="devCommentsSnapshot"
    >
      <EuiSkeletonRectangle
        isLoading={!src}
        width="100%"
        height="100%"
        borderRadius="s"
        contentAriaLabel={alt}
      >
        {src && (
          <EuiImage
            src={src}
            alt={alt}
            size="fullWidth"
            allowFullScreen
            hasShadow
            onFullScreen={controller.setOverlayOpen}
          />
        )}
      </EuiSkeletonRectangle>
    </div>
  );
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import { FilesContext } from '@kbn/shared-ux-file-context';
import { skip, take, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import type { AuthenticatedUser } from '@kbn/security-plugin/common/model';
import { ImageConfig } from '../types';
import { ImageEditorFlyout } from './image_editor_flyout';
import { ImageViewerContext } from '../image_viewer';
import {
  OverlayStart,
  ApplicationStart,
  FilesClient,
  FileImageMetadata,
  ThemeServiceStart,
} from '../imports';
import { ValidateUrlFn } from '../utils/validate_url';

/**
 * @throws in case user cancels
 */
export async function configureImage(
  deps: {
    files: FilesClient<FileImageMetadata>;
    overlays: OverlayStart;
    theme: ThemeServiceStart;
    currentAppId$: ApplicationStart['currentAppId$'];
    validateUrl: ValidateUrlFn;
    getImageDownloadHref: (fileId: string) => string;
    user?: AuthenticatedUser;
  },
  initialImageConfig?: ImageConfig
): Promise<ImageConfig> {
  return new Promise((resolve, reject) => {
    const closed$ = new Subject<true>();

    const onSave = (imageConfig: ImageConfig) => {
      resolve(imageConfig);
      handle.close();
    };

    const onCancel = () => {
      reject();
      handle.close();
    };

    // Close the flyout on application change.
    deps.currentAppId$.pipe(takeUntil(closed$), skip(1), take(1)).subscribe(() => {
      handle.close();
    });

    const handle = deps.overlays.openFlyout(
      toMountPoint(
        <FilesContext client={deps.files}>
          <ImageViewerContext.Provider
            value={{
              getImageDownloadHref: deps.getImageDownloadHref,
              validateUrl: deps.validateUrl,
            }}
          >
            <ImageEditorFlyout
              onCancel={onCancel}
              onSave={onSave}
              initialImageConfig={initialImageConfig}
              validateUrl={deps.validateUrl}
              user={deps.user}
            />
          </ImageViewerContext.Provider>
        </FilesContext>,
        { theme$: deps.theme.theme$ }
      ),
      {
        ownFocus: true,
        'data-test-subj': 'createImageEmbeddableFlyout',
      }
    );

    handle.onClose.then(() => {
      closed$.next(true);
    });
  });
}

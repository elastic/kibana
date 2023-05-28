/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Debug from 'debug';
import { ScreenshotArtifact, ScreenshotUploadInstruction } from '../types';
import { updateInstanceStdout } from './api';
import { safe } from './lang';
import { warn } from './log';
import { uploadImage, uploadVideo } from './upload';
const debug = Debug('currents:artifacts');
interface UploadArtifacts {
  videoPath: string | null;
  videoUploadUrl?: string | null;
  screenshots: ScreenshotArtifact[];
  screenshotUploadUrls: ScreenshotUploadInstruction[];
}
export async function uploadArtifacts({
  videoPath,
  videoUploadUrl,
  screenshots,
  screenshotUploadUrls,
}: UploadArtifacts) {
  // title("blue", "Uploading  Results");

  debug('uploading artifacts: %o', {
    videoPath,
    videoUploadUrl,
    screenshots,
    screenshotUploadUrls,
  });

  const totalUploads = (videoPath ? 1 : 0) + screenshots.length;
  if (totalUploads === 0) {
    // info("Nothing to upload");
    return;
  }

  // upload video
  if (videoUploadUrl && videoPath) {
    await safe(
      uploadVideo,
      (e) => debug('failed uploading video %s. Error: %o', videoPath, e),
      () => debug('success uploading', videoPath)
    )(videoPath, videoUploadUrl);
  }
  // upload screenshots
  if (screenshotUploadUrls && screenshotUploadUrls.length) {
    await Promise.all(
      screenshots.map((screenshot) => {
        const url = screenshotUploadUrls.find(
          (urls) => urls.screenshotId === screenshot.screenshotId
        )?.uploadUrl;
        if (!url) {
          debug(
            'No upload url for screenshot %o, screenshotUploadUrls: %o',
            screenshot,
            screenshotUploadUrls
          );
          warn('Cannot find upload url for screenshot: %s', screenshot.path);
          return Promise.resolve();
        }
        return safe(
          uploadImage,
          (e) => debug('failed uploading screenshot %s. Error: %o', screenshot.path, e),
          () => debug('success uploading', screenshot.path)
        )(screenshot.path, url);
      })
    );
  }
}

export const uploadStdoutSafe = safe(
  updateInstanceStdout,
  () => {},
  () => {}
);

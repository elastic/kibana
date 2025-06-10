/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  extractImageInfo,
  getCommitUrl,
  getImageVersion,
  getServerlessImageTag,
} from './extract_image_info';

jest.mock('execa');
const execa = jest.requireMock('execa');

describe('extractImageInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls docker, once, and only once for one image', async () => {
    const image = 'nevermind';
    const image2 = 'nevermind2';
    const labelsJson = '{"org.opencontainers.image.revision": "revision"}';
    execa.mockResolvedValue({ stdout: labelsJson });

    await extractImageInfo(image);
    await extractImageInfo(image);
    expect(execa).toHaveBeenCalledTimes(1);

    await extractImageInfo(image2);
    expect(execa).toHaveBeenCalledTimes(2);
  });

  it('should return image labels as an object', () => {
    const image = 'nevermind123';
    const obj = { 'org.opencontainers.image.revision': 'revision', extra: 123 };
    const labelsJson = JSON.stringify(obj);
    execa.mockResolvedValue({ stdout: labelsJson });

    const imageInfo = extractImageInfo(image);

    expect(imageInfo).resolves.toEqual(obj);
  });
});

describe('getImageVersion', () => {
  it("should return the image's revision", () => {
    const image = 'test-image';
    const labels = { 'org.opencontainers.image.revision': 'deadbeef1234' };
    execa.mockResolvedValue({ stdout: JSON.stringify(labels) });

    const imageVersion = getImageVersion(image);

    expect(imageVersion).resolves.toBe('deadbeef1234');
  });
});

describe('getCommitUrl', () => {
  it('should return the commit url', () => {
    const image = 'docker.elastic.co/elasticsearch/elasticsearch:7.15.0';
    const labels = {
      'org.opencontainers.image.source': 'https://github.com/elastic/elasticsearch',
      'org.opencontainers.image.revision': 'deadbeef1234',
    };
    execa.mockResolvedValue({ stdout: JSON.stringify(labels) });

    expect(getCommitUrl(image)).resolves.toBe(
      'https://github.com/elastic/elasticsearch/commit/deadbeef1234'
    );
  });
});

describe('getServerlessImageTag', () => {
  it('should return the image tag', () => {
    const image = 'docker.elastic.co/elasticsearch-ci/elasticsearch-serverless:latest';
    const labels = { 'org.opencontainers.image.revision': 'deadbeef12345678' };
    execa.mockResolvedValue({ stdout: JSON.stringify(labels) });

    const imageTag = getServerlessImageTag(image);

    expect(imageTag).resolves.toBe('git-deadbeef1234');
  });
});

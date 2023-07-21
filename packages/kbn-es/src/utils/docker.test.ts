/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { resolveDockerImage, DOCKER_IMG, setupDocker } from './docker';
import { ToolingLog, ToolingLogCollectingWriter } from '@kbn/tooling-log';

const verifyDockerInstalledMock = jest.fn();
const maybeCreateDockerNetworkMock = jest.fn();

jest.doMock('./docker', () => {
  const original = jest.requireActual('./docker');

  return {
    ...original,
    verifyDockerInstalled: verifyDockerInstalledMock,
    maybeCreateDockerNetwork: maybeCreateDockerNetworkMock,
  };
});

// jest.mock('execa');
// const execa = jest.requireMock('execa');

const log = new ToolingLog();
const logWriter = new ToolingLogCollectingWriter();
log.setWriters([logWriter]);

beforeEach(() => {
  jest.resetAllMocks();
  log.indent(-log.getIndent());
  logWriter.messages.length = 0;
});

describe('resolveDockerImage()', () => {
  const defaultRepo = 'another/repo';
  const defaultImg = 'default/reg/repo:tag';
  const tag = '8.8.2';

  test('should return default image without options', () => {
    const image = resolveDockerImage({ repo: defaultRepo, defaultImg });

    expect(image).toEqual(defaultImg);
  });

  test('should return tag with default repo when tag is passed', () => {
    const image = resolveDockerImage({ repo: defaultRepo, tag, defaultImg });

    expect(image).toMatchInlineSnapshot(`"another/repo:8.8.2"`);
  });

  test('should return image when tag is also passed', () => {
    const image = resolveDockerImage({ repo: defaultRepo, tag, image: DOCKER_IMG, defaultImg });

    expect(image).toEqual(DOCKER_IMG);
  });

  test('should error when invalid registry is passed', () => {
    expect(() =>
      resolveDockerImage({
        repo: defaultRepo,
        tag,
        image: 'another.registry.co/es/es:latest',
        defaultImg,
      })
    ).toThrowErrorMatchingInlineSnapshot(`
      "Only verified images from docker.elastic.co are currently allowed.
      If you require this functionality in @kbn/es please contact the Kibana Operations Team."
    `);
  });
});

describe('setupDocker()', () => {
  test('should log the Docker version when it is installed', async () => {
    verifyDockerInstalledMock.mockImplementationOnce(() =>
      log.info('Docker version 23.0.5, build bc4487c')
    );

    await setupDocker(log);

    expect(logWriter.messages).toMatchInlineSnapshot(`
      Array [
        " [34minfo[39m [1mVerifying Docker is installed.[22m",
        "   │ [34minfo[39m Docker version 23.0.5, build bc4487a",
        " [34minfo[39m [1mChecking status of elastic Docker network.[22m",
        "   │ [34minfo[39m Using existing network.",
      ]
    `);

    // expect(verifyDockerInstalledMock.mock.calls).toMatchInlineSnapshot(`Array []`);
    // expect(verifyDockerInstalled.mock.calls).toMatchInlineSnapshot(`Array []`);
  });
});

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  API,
  httpError,
  ok,
  parseInput,
  request,
  resetMocksAroundEachTest,
  run,
  sent,
  vendorError,
} from './test_helpers';

resetMocksAroundEachTest();

const items = (status: number, error?: { code: string; message: string }) =>
  ok([{ status, ...(error ? { body: { error } } : {}) }], {}, 207);

const QUOTA_HEADERS = {
  'tmv1-submission-reserve-count': '1',
  'tmv1-submission-remaining-count': '9',
  'tmv1-submission-count': '1',
  'tmv1-submission-exemption-count': '0',
};

describe('TrendAI Vision One suspicious object lists', () => {
  it('adds an object keyed by its type with the given options', async () => {
    request.mockResolvedValueOnce(items(201));
    const result = await run('addToSuspiciousObjectList', {
      type: 'domain',
      value: 'soar-test.example',
      scanAction: 'log',
      riskLevel: 'low',
      daysToExpiration: 1,
      description: 'soar test',
    });
    expect(sent()).toMatchObject({ method: 'POST', url: `${API}/threatintel/suspiciousObjects` });
    expect(sent().data).toEqual([
      {
        domain: 'soar-test.example',
        scanAction: 'log',
        riskLevel: 'low',
        daysToExpiration: 1,
        description: 'soar test',
      },
    ]);
    expect(result).toEqual({
      type: 'domain',
      value: 'soar-test.example',
      outcome: 'added',
      status: 201,
      error: null,
    });
  });

  it('removes an object and reports removed', async () => {
    request.mockResolvedValueOnce(items(204));
    await expect(
      run('removeFromSuspiciousObjectList', { type: 'fileSha256', value: 'a'.repeat(64) })
    ).resolves.toMatchObject({
      outcome: 'removed',
    });
    expect(sent()).toMatchObject({ url: `${API}/threatintel/suspiciousObjects/delete` });
    expect(sent().data).toEqual([{ fileSha256: 'a'.repeat(64) }]);
  });

  it.each([
    [404, { code: 'NotFound', message: 'Object not found' }],
    [400, { code: 'BadRequest', message: 'The object does not exist' }],
  ])(
    'returns notFound when the object to remove is not on the list (%s)',
    async (status, error) => {
      request.mockResolvedValueOnce(items(status, error));
      await expect(
        run('removeFromSuspiciousObjectList', { type: 'ip', value: '203.0.113.9' })
      ).resolves.toMatchObject({
        outcome: 'notFound',
        error,
      });
    }
  );

  it('fails on any other item error', async () => {
    request.mockResolvedValueOnce(items(400, { code: 'BadRequest', message: 'Invalid URL' }));
    await expect(run('addToSuspiciousObjectList', { type: 'url', value: 'bad' })).rejects.toThrow(
      'addToSuspiciousObjectList failed for the target (400): BadRequest: Invalid URL'
    );
  });

  it('adds an exception', async () => {
    request.mockResolvedValueOnce(items(201));
    await run('addToExceptionList', {
      type: 'url',
      value: 'https://intranet.example/*',
      description: 'lab',
    });
    expect(sent()).toMatchObject({ url: `${API}/threatintel/suspiciousObjectExceptions` });
    expect(sent().data).toEqual([{ url: 'https://intranet.example/*', description: 'lab' }]);
  });

  it.each([
    [{ type: 'fileSha1', value: 'a'.repeat(39) }, false],
    [{ type: 'fileSha1', value: 'g'.repeat(40) }, false],
    [{ type: 'fileSha1', value: 'a'.repeat(40) }, true],
    [{ type: 'fileSha256', value: 'a'.repeat(64) }, true],
    [{ type: 'ip', value: '1'.repeat(40) }, false],
    [{ type: 'domain', value: 'd'.repeat(253) }, true],
    [{ type: 'domain', value: 'd'.repeat(254) }, false],
    [{ type: 'senderMailAddress', value: 'm'.repeat(321) }, false],
    [{ type: 'url', value: 'u'.repeat(2048) }, true],
    [{ type: 'url', value: 'u'.repeat(2049) }, false],
    [{ type: 'URL', value: 'x' }, false],
    [{ type: 'ip', value: '1.1.1.1', daysToExpiration: 366 }, false],
    [{ type: 'ip', value: '1.1.1.1', daysToExpiration: -1 }, true],
    [{ type: 'ip', value: '1.1.1.1', scanAction: 'Block' }, false],
  ])('checks %j against the per-type limits (valid: %s)', (input, valid) => {
    expect(parseInput('addToSuspiciousObjectList', input).success).toBe(valid);
  });
});

describe('TrendAI Vision One sandbox', () => {
  it('submits the decoded file as multipart with base64-encoded passwords and returns the quota', async () => {
    request.mockResolvedValueOnce(ok({ id: 'sub-1', digest: { sha1: 'x' } }, QUOTA_HEADERS, 202));
    const result = await run('submitFileToSandbox', {
      file: Buffer.from('hello').toString('base64'),
      fileName: 'hello.txt',
      archivePassword: 'infected',
    });
    const form = sent().data as FormData;
    expect(sent()).toMatchObject({ method: 'POST', url: `${API}/sandbox/files/analyze` });
    expect(form.get('archivePassword')).toBe(Buffer.from('infected').toString('base64'));
    expect(form.get('documentPassword')).toBeNull();
    const file = form.get('file') as File;
    expect(file.name).toBe('hello.txt');
    expect(Buffer.from(await file.arrayBuffer()).toString()).toBe('hello');
    expect(result).toEqual({
      id: 'sub-1',
      digest: { sha1: 'x' },
      arguments: null,
      quota: { reserveCount: 1, remainingCount: 9, count: 1, exemptionCount: 0 },
    });
  });

  it('returns the 413 message for a file the product will not take', async () => {
    request.mockRejectedValueOnce(
      httpError(413, vendorError('RequestEntityTooLarge', 'File too large'))
    );
    await expect(
      run('submitFileToSandbox', { file: 'aGVsbG8=', fileName: 'a.bin' })
    ).rejects.toThrow('the submission is too large: RequestEntityTooLarge: File too large');
  });

  it('submits URLs as one item each and returns every item', async () => {
    const answer = [
      { status: 202, body: { id: 'u-1', url: 'https://example.com' } },
      {
        status: 400,
        body: { url: 'test', error: { code: 'BadRequest', message: 'URL format is not right' } },
      },
    ];
    request.mockResolvedValueOnce(ok(answer, QUOTA_HEADERS, 207));
    const result = (await run('submitUrlsToSandbox', {
      urls: ['https://example.com', 'test'],
    })) as Record<string, unknown>;
    expect(sent().data).toEqual([{ url: 'https://example.com' }, { url: 'test' }]);
    expect(result.items).toEqual(answer);
  });

  it('gets an analysis result and reports a running analysis as not found', async () => {
    request.mockResolvedValueOnce(ok({ id: 'sub-1', riskLevel: 'noRisk' }));
    await expect(run('getSandboxAnalysisResult', { id: 'sub-1' })).resolves.toEqual({
      id: 'sub-1',
      riskLevel: 'noRisk',
    });
    expect(sent().url).toBe(`${API}/sandbox/analysisResults/sub-1`);
    request.mockRejectedValueOnce(httpError(404, vendorError('NotFound', 'Not found')));
    await expect(run('getSandboxAnalysisResult', { id: 'sub-2' })).rejects.toThrow(
      'still running, or unknown id'
    );
  });

  it.each([
    ['submitUrlsToSandbox', { urls: [] }],
    ['submitUrlsToSandbox', { urls: Array(11).fill('https://example.com') }],
    ['submitUrlsToSandbox', { urls: ['u'.repeat(2049)] }],
    ['submitFileToSandbox', { file: 'not base64!', fileName: 'a' }],
    ['submitFileToSandbox', { file: 'a'.repeat(1048580), fileName: 'a' }],
    ['submitFileToSandbox', { file: 'aGVsbG8=', fileName: 'a', documentPassword: 'é'.repeat(65) }],
  ])('%s rejects %j at the schema', (name, input) => {
    expect(parseInput(name, input).success).toBe(false);
  });

  it.each([
    ['5 characters (a dangling character Buffer would drop)', 'aGVsb'],
    ['unpadded', 'aGVsbG8'],
    ['short padding', 'aGVsbG8=='.slice(0, 6)],
    ['padding in the middle', 'aG=sbG8='],
    ['non-zero bits before the padding', 'aGVsbG9='],
    ['too much padding', 'aGVsbA==='],
  ])('submitFileToSandbox rejects file content that is not canonical base64: %s', (_case, file) => {
    const parsed = parseInput('submitFileToSandbox', { file, fileName: 'a.txt' });
    expect(parsed.success).toBe(false);
    expect(JSON.stringify(parsed.error)).toMatch(/file is (padded )?base64 content/);
  });

  it.each([
    ['no padding', Buffer.from('abc').toString('base64')],
    ['one padding character', Buffer.from('hello').toString('base64')],
    ['two padding characters', Buffer.from('elastic').toString('base64')],
    ['+ and /', Buffer.from([0xfb, 0xff, 0xbf]).toString('base64')],
  ])('submitFileToSandbox accepts canonical base64 with %s', (_case, file) => {
    expect(parseInput('submitFileToSandbox', { file, fileName: 'a.txt' }).success).toBe(true);
  });
});

describe('TrendAI Vision One list and sandbox input bounds', () => {
  const OBJECT = { type: 'domain', value: 'test-elastic-soar.invalid' };

  it('accepts a 1000-character description and rejects 1001', () => {
    expect(
      parseInput('addToSuspiciousObjectList', { ...OBJECT, description: 'd'.repeat(1000) }).success
    ).toBe(true);
    expect(
      parseInput('addToSuspiciousObjectList', { ...OBJECT, description: 'd'.repeat(1001) }).success
    ).toBe(false);
    expect(
      parseInput('addToExceptionList', { ...OBJECT, description: 'd'.repeat(1001) }).success
    ).toBe(false);
  });

  it.each([
    ['documentPassword', 128],
    ['archivePassword', 128],
    ['arguments', 1024],
  ])('%s takes exactly %s bytes of UTF-8 and rejects one byte more', (field, bytes) => {
    const file = { file: 'ZWxhc3RpYw==', fileName: 'a.txt' };
    const twoByte = '\u00e9'.repeat(bytes / 2);
    expect(Buffer.byteLength(twoByte, 'utf8')).toBe(bytes);
    expect(parseInput('submitFileToSandbox', { ...file, [field]: twoByte }).success).toBe(true);
    expect(
      parseInput('submitFileToSandbox', { ...file, [field]: `${twoByte.slice(1)}aa` }).success
    ).toBe(true);
    expect(parseInput('submitFileToSandbox', { ...file, [field]: `${twoByte}a` }).success).toBe(
      false
    );
  });

  it('treats a list item status of 299 as added and 300 as a failure', async () => {
    request.mockResolvedValueOnce(ok([{ status: 299 }], {}, 207));
    await expect(run('addToSuspiciousObjectList', OBJECT)).resolves.toMatchObject({
      outcome: 'added',
    });
    request.mockResolvedValueOnce(
      ok([{ status: 300, body: { error: { code: 'X', message: 'item' } } }], {}, 207)
    );
    await expect(run('addToSuspiciousObjectList', OBJECT)).rejects.toThrow(
      'addToSuspiciousObjectList failed for the target (300): X: item'
    );
  });
});

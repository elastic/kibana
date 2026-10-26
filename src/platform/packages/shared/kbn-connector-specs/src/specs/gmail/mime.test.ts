/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildRawMessage, extractAddrSpec, findHeader } from './mime';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Decode a base64url `raw` field and split into header lines + decoded body. */
const decodeRaw = (raw: string) => {
  const message = Buffer.from(raw, 'base64url').toString('utf8');
  const separatorIndex = message.indexOf('\r\n\r\n');
  const headerBlock = message.slice(0, separatorIndex);
  const bodyBlock = message.slice(separatorIndex + 4);
  return {
    message,
    headerLines: headerBlock.split('\r\n'),
    // Body lines are base64-encoded; strip CRLF wrapping, then decode.
    body: Buffer.from(bodyBlock.replace(/\r\n/g, ''), 'base64').toString('utf8'),
  };
};

// ---------------------------------------------------------------------------
// buildRawMessage
// ---------------------------------------------------------------------------

describe('buildRawMessage', () => {
  it('produces the correct ordered header list for a minimal message', () => {
    const raw = buildRawMessage({
      to: ['a@example.com'],
      subject: 'Hi',
      body: 'Hello',
    });

    const { headerLines } = decodeRaw(raw);

    expect(headerLines).toEqual([
      'To: a@example.com',
      'Subject: Hi',
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
    ]);
  });

  it('round-trips the body through base64', () => {
    const { body } = decodeRaw(
      buildRawMessage({ to: ['a@example.com'], subject: 'Hi', body: 'Hello' })
    );
    expect(body).toBe('Hello');
  });

  it('does not include a From header', () => {
    const { headerLines } = decodeRaw(
      buildRawMessage({ to: ['a@example.com'], subject: 'Hi', body: 'body' })
    );
    expect(headerLines.some((l) => l.startsWith('From:'))).toBe(false);
  });

  it('joins multiple To recipients with comma-space', () => {
    const { headerLines } = decodeRaw(
      buildRawMessage({ to: ['a@example.com', 'b@example.com'], subject: 'Hi', body: 'body' })
    );
    expect(headerLines[0]).toBe('To: a@example.com, b@example.com');
  });

  it('includes Cc and Bcc when provided, in header order To/Cc/Bcc', () => {
    const { headerLines } = decodeRaw(
      buildRawMessage({
        to: ['a@example.com'],
        subject: 'Hi',
        body: 'body',
        cc: ['cc@example.com'],
        bcc: ['bcc@example.com'],
      })
    );
    expect(headerLines[0]).toBe('To: a@example.com');
    expect(headerLines[1]).toBe('Cc: cc@example.com');
    expect(headerLines[2]).toBe('Bcc: bcc@example.com');
  });

  it('omits Cc and Bcc headers when not provided', () => {
    const { headerLines } = decodeRaw(
      buildRawMessage({ to: ['a@example.com'], subject: 'Hi', body: 'body' })
    );
    expect(headerLines.some((l) => l.startsWith('Cc:') || l.startsWith('Bcc:'))).toBe(false);
  });

  it('sets Content-Type to text/html when bodyType is html', () => {
    const { headerLines } = decodeRaw(
      buildRawMessage({
        to: ['a@example.com'],
        subject: 'Hi',
        body: '<p>Hello</p>',
        bodyType: 'html',
      })
    );
    const contentType = headerLines.find((l) => l.startsWith('Content-Type:'));
    expect(contentType).toBe('Content-Type: text/html; charset="UTF-8"');
  });

  it('uses CRLF line endings throughout — no bare LF', () => {
    const raw = buildRawMessage({ to: ['a@example.com'], subject: 'Hi', body: 'body' });
    const message = Buffer.from(raw, 'base64url').toString('utf8');
    // A LF not preceded by CR is a bare LF, which is not RFC 5322 compliant.
    expect(message).not.toMatch(/(?<!\r)\n/);
  });

  it('does not RFC-2047-encode a pure ASCII subject', () => {
    const { headerLines } = decodeRaw(
      buildRawMessage({ to: ['a@example.com'], subject: 'Quarterly report', body: 'body' })
    );
    expect(headerLines.find((l) => l.startsWith('Subject:'))).toBe('Subject: Quarterly report');
  });

  it('RFC-2047-encodes a non-ASCII subject and round-trips correctly', () => {
    const originalSubject = 'Phishing — 警告 ✉';
    const { headerLines } = decodeRaw(
      buildRawMessage({ to: ['a@example.com'], subject: originalSubject, body: 'body' })
    );

    const subjectLine = headerLines.find((l) => l.startsWith('Subject:'));
    if (!subjectLine) throw new Error('Subject header not found');

    // Collect all encoded-words from potentially folded continuation lines.
    // The subject header value may span multiple physical lines joined by CRLF + space.
    const subjectValue = subjectLine.replace(/^Subject: /, '');
    const allLines = [subjectValue, ...headerLines.slice(headerLines.indexOf(subjectLine) + 1)]
      .join('')
      .replace(/\r\n /g, '');

    // Each encoded-word must be in the form =?UTF-8?B?<base64>?=
    const encodedWordRegex = /=\?UTF-8\?B\?([^?]+)\?=/g;
    const decoded = [...allLines.matchAll(encodedWordRegex)]
      .map((m) => Buffer.from(m[1], 'base64').toString('utf8'))
      .join('');

    expect(decoded).toBe(originalSubject);
  });

  it('encodes each RFC 2047 encoded-word at or under 75 chars for a non-ASCII subject', () => {
    const longSubject = '警告'.repeat(30); // 180 chars, forces multiple encoded-words
    const raw = buildRawMessage({ to: ['a@example.com'], subject: longSubject, body: 'body' });
    const message = Buffer.from(raw, 'base64url').toString('utf8');
    const [headerBlock] = message.split('\r\n\r\n');

    // Collect all encoded-words from the header block (may span folded lines).
    const encodedWordRegex = /=\?UTF-8\?B\?([^?]+)\?=/g;
    const encodedWords = [...headerBlock.matchAll(/=\?[^?]*\?[^?]*\?[^?]*\?=/g)];
    expect(encodedWords.length).toBeGreaterThan(0);
    // RFC 2047: each encoded-word must be at most 75 characters.
    for (const match of encodedWords) {
      expect(match[0].length).toBeLessThanOrEqual(75);
    }
    // Continuation lines in a folded header must start with at least one whitespace.
    const physicalLines = headerBlock.split('\r\n');
    const subjectIdx = physicalLines.findIndex((l) => l.startsWith('Subject:'));
    for (const line of physicalLines.slice(subjectIdx + 1)) {
      if (!line.startsWith('To:') && !line.startsWith('MIME') && !line.startsWith('Content')) {
        // A folded continuation line — must start with whitespace.
        expect(line).toMatch(/^\s/);
        break; // Only first continuation line needed to confirm folding pattern.
      }
    }
    // Confirm full round-trip.
    const decoded = [...headerBlock.matchAll(encodedWordRegex)]
      .map((m) => Buffer.from(m[1], 'base64').toString('utf8'))
      .join('');
    expect(decoded).toBe(longSubject);
  });

  it('does not split a multi-byte UTF-8 sequence across encoded-word chunks', () => {
    // A subject of 100 😀 emojis: each is 4 bytes, so chunk boundaries must
    // fall on code-point boundaries, never inside a 4-byte sequence.
    const originalSubject = '😀'.repeat(100);
    const { headerLines } = decodeRaw(
      buildRawMessage({ to: ['a@example.com'], subject: originalSubject, body: 'body' })
    );

    const subjectLine = headerLines.find((l) => l.startsWith('Subject:'));
    if (!subjectLine) throw new Error('Subject header not found');
    const allLines = [
      subjectLine.replace(/^Subject: /, ''),
      ...headerLines.slice(headerLines.indexOf(subjectLine) + 1),
    ]
      .join('')
      .replace(/\r\n /g, '');

    const encodedWordRegex = /=\?UTF-8\?B\?([^?]+)\?=/g;
    const decoded = [...allLines.matchAll(encodedWordRegex)]
      .map((m) => Buffer.from(m[1], 'base64').toString('utf8'))
      .join('');

    expect(decoded).toBe(originalSubject);
  });

  it('round-trips a non-ASCII body through base64', () => {
    const originalBody = '日本語のメッセージ 🎉';
    const { body } = decodeRaw(
      buildRawMessage({ to: ['a@example.com'], subject: 'Hi', body: originalBody })
    );
    expect(body).toBe(originalBody);
  });

  it('wraps the body base64 at 76 characters per line', () => {
    const longBody = 'x'.repeat(5000);
    const raw = buildRawMessage({ to: ['a@example.com'], subject: 'Hi', body: longBody });
    const message = Buffer.from(raw, 'base64url').toString('utf8');
    const bodyBlock = message.split('\r\n\r\n')[1];
    const bodyLines = bodyBlock.split('\r\n');

    for (const line of bodyLines) {
      expect(line.length).toBeLessThanOrEqual(76);
    }
    // Confirm the full body still round-trips.
    const decoded = Buffer.from(bodyLines.join(''), 'base64').toString('utf8');
    expect(decoded).toBe(longBody);
  });

  it('rejects a subject containing a CR (header injection)', () => {
    expect(() =>
      buildRawMessage({
        to: ['a@example.com'],
        subject: 'Hi\r\nBcc: attacker@evil.com',
        body: 'body',
      })
    ).toThrow(/must not contain line breaks/);
  });

  it('rejects a subject containing a bare LF (header injection)', () => {
    expect(() =>
      buildRawMessage({
        to: ['a@example.com'],
        subject: 'Hi\nBcc: attacker@evil.com',
        body: 'body',
      })
    ).toThrow(/must not contain line breaks/);
  });

  it('rejects a To address containing a newline (header injection)', () => {
    expect(() =>
      buildRawMessage({
        to: ['a@example.com\r\nBcc: attacker@evil.com'],
        subject: 'Hi',
        body: 'body',
      })
    ).toThrow(/must not contain line breaks/);
  });

  it('sets In-Reply-To and starts a References chain when only inReplyTo is provided', () => {
    const { headerLines } = decodeRaw(
      buildRawMessage({
        to: ['a@example.com'],
        subject: 'Re: Hi',
        body: 'body',
        inReplyTo: '<orig@mail.gmail.com>',
      })
    );
    expect(headerLines).toContain('In-Reply-To: <orig@mail.gmail.com>');
    expect(headerLines).toContain('References: <orig@mail.gmail.com>');
  });

  it('appends inReplyTo to existing references when references is provided', () => {
    const { headerLines } = decodeRaw(
      buildRawMessage({
        to: ['a@example.com'],
        subject: 'Re: Hi',
        body: 'body',
        inReplyTo: '<new@mail.gmail.com>',
        references: '<first@mail.gmail.com>',
      })
    );
    expect(headerLines).toContain('In-Reply-To: <new@mail.gmail.com>');
    expect(headerLines).toContain('References: <first@mail.gmail.com> <new@mail.gmail.com>');
  });

  it('emits References but not In-Reply-To when references is provided without inReplyTo', () => {
    const { headerLines } = decodeRaw(
      buildRawMessage({
        to: ['a@example.com'],
        subject: 'Re: Hi',
        body: 'body',
        references: '<first@mail.gmail.com>',
      })
    );
    expect(headerLines).toContain('References: <first@mail.gmail.com>');
    expect(headerLines.some((l) => l.startsWith('In-Reply-To:'))).toBe(false);
  });

  it('rejects a References value containing a newline (header injection)', () => {
    expect(() =>
      buildRawMessage({
        to: ['a@example.com'],
        subject: 'Re: Hi',
        body: 'body',
        inReplyTo: '<msg@mail.gmail.com>',
        references: '<first@mail.gmail.com>\r\nBcc: attacker@evil.com',
      })
    ).toThrow(/must not contain line breaks/);
  });

  it('omits In-Reply-To and References when inReplyTo is not provided', () => {
    const { headerLines } = decodeRaw(
      buildRawMessage({ to: ['a@example.com'], subject: 'Hi', body: 'body' })
    );
    expect(
      headerLines.some((l) => l.startsWith('In-Reply-To:') || l.startsWith('References:'))
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractAddrSpec
// ---------------------------------------------------------------------------

describe('extractAddrSpec', () => {
  it('extracts the addr-spec from a formatted address with display name', () => {
    expect(extractAddrSpec('"Alice B" <alice@example.com>')).toBe('alice@example.com');
  });

  it('passes through a bare addr-spec unchanged', () => {
    expect(extractAddrSpec('alice@example.com')).toBe('alice@example.com');
  });

  it('trims surrounding whitespace', () => {
    expect(extractAddrSpec('  alice@example.com  ')).toBe('alice@example.com');
  });

  it('trims whitespace inside angle brackets', () => {
    expect(extractAddrSpec('<  alice@example.com  >')).toBe('alice@example.com');
  });
});

// ---------------------------------------------------------------------------
// findHeader
// ---------------------------------------------------------------------------

describe('findHeader', () => {
  const headers = [
    { name: 'From', value: 'sender@example.com' },
    { name: 'Message-Id', value: '<abc@mail.gmail.com>' },
    { name: 'Subject', value: 'Hello' },
  ];

  it('finds a header by exact name', () => {
    expect(findHeader(headers, 'From')).toBe('sender@example.com');
  });

  it('finds a header case-insensitively (Message-Id vs Message-ID)', () => {
    expect(findHeader(headers, 'MESSAGE-ID')).toBe('<abc@mail.gmail.com>');
    expect(findHeader(headers, 'message-id')).toBe('<abc@mail.gmail.com>');
  });

  it('returns undefined for a missing header', () => {
    expect(findHeader(headers, 'Reply-To')).toBeUndefined();
  });

  it('returns undefined when headers array is undefined', () => {
    expect(findHeader(undefined, 'From')).toBeUndefined();
  });

  it('returns undefined when headers array is empty', () => {
    expect(findHeader([], 'From')).toBeUndefined();
  });
});

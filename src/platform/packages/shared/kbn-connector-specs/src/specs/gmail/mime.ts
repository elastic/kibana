/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Minimal RFC 5322 message builder for the Gmail `users.messages.send` endpoint,
 * which accepts the entire message as a single base64url-encoded string in `raw`.
 *
 * Design constraints:
 * - `From` is omitted — Gmail stamps the authenticated user's own address. Setting
 *   it to anything else fails unless it's a verified send-as alias, and the handler
 *   has no way to know the caller's own address without an extra profile round-trip.
 * - Bare addr-spec recipients only (e.g. `user@example.com`), no display names.
 *   This removes a whole class of RFC 2047 / RFC 5322 quoting edge cases.
 * - Body is always `Content-Transfer-Encoding: base64`, wrapped at 76 chars.
 *   This sidesteps quoted-printable entirely and guarantees no line exceeds
 *   RFC 5322's 998-octet limit, which real MTAs enforce.
 * - Non-ASCII subjects are encoded as RFC 2047 `=?UTF-8?B?…?=` encoded-words,
 *   chunked on code-point boundaries and folded with CRLF + space.
 * - No attachments / multipart — out of scope for v1.
 */

/** RFC 2045 caps base64 line length at 76 characters. */
const BASE64_LINE_LENGTH = 76;

/**
 * RFC 2047 caps a single encoded-word at 75 characters. The `=?UTF-8?B??=`
 * wrapper costs 12 chars, leaving 63 for the base64 payload, which encodes
 * at most 45 source bytes without padding overflow.
 */
const MAX_ENCODED_WORD_PAYLOAD_BYTES = 45;

/**
 * A CR or LF in a header value would let a caller append arbitrary headers
 * (e.g. an extra `Bcc:`) to a message sent from the user's own mailbox.
 * Input schemas also reject these; this guard survives future schema changes.
 */
const assertSingleLineHeader = (name: string, value: string): void => {
  if (/[\r\n]/.test(value)) {
    throw new Error(`Gmail message ${name} must not contain line breaks.`);
  }
};

const isAsciiPrintable = (value: string): boolean => !/[^\x20-\x7E]/.test(value);

/**
 * Encodes a header value as one or more RFC 2047 base64 encoded-words when it
 * contains non-ASCII characters. Chunks are split on code-point boundaries so
 * a multi-byte UTF-8 sequence is never cut in half. Adjacent encoded-words are
 * joined with a folding CRLF + space; receivers concatenate them without the
 * whitespace separator per RFC 2047 §6.2.
 */
const encodeHeaderValue = (value: string): string => {
  if (isAsciiPrintable(value)) {
    return value;
  }

  const chunks: string[] = [];
  let current = '';
  let currentBytes = 0;

  for (const char of value) {
    const charBytes = Buffer.byteLength(char, 'utf8');
    if (currentBytes > 0 && currentBytes + charBytes > MAX_ENCODED_WORD_PAYLOAD_BYTES) {
      chunks.push(current);
      current = '';
      currentBytes = 0;
    }
    current += char;
    currentBytes += charBytes;
  }
  if (current.length > 0) {
    chunks.push(current);
  }

  return chunks
    .map((chunk) => `=?UTF-8?B?${Buffer.from(chunk, 'utf8').toString('base64')}?=`)
    .join('\r\n ');
};

/** Constructed once from the module constant; hoisted to avoid per-call allocation. */
const BASE64_LINE_RE = new RegExp(`.{1,${BASE64_LINE_LENGTH}}`, 'g');

/** Base64-encodes a body string and wraps lines at 76 characters per RFC 2045. */
const encodeBody = (body: string): string => {
  const encoded = Buffer.from(body, 'utf8').toString('base64');
  return (encoded.match(BASE64_LINE_RE) ?? ['']).join('\r\n');
};

export interface BuildRawMessageArgs {
  /** Recipient addr-specs (bare, e.g. "user@example.com"). At least one required. */
  to: string[];
  subject: string;
  body: string;
  bodyType?: 'text' | 'html';
  cc?: string[];
  /** BCC addresses — Gmail strips this header from delivered copies. */
  bcc?: string[];
  /**
   * `Message-ID` header value of the message being replied to, including angle
   * brackets (e.g. `<abc123@mail.gmail.com>`). Sets `In-Reply-To` and `References`.
   */
  inReplyTo?: string;
  /** Existing `References` header from the original message, if present. */
  references?: string;
}

/**
 * Builds an RFC 5322 message and returns it base64url-encoded, ready to use as
 * the `raw` field of a Gmail `messages.send` or `messages.reply` request.
 */
export const buildRawMessage = ({
  to,
  subject,
  body,
  bodyType = 'text',
  cc,
  bcc,
  inReplyTo,
  references,
}: BuildRawMessageArgs): string => {
  const headers: string[] = [];

  const addAddressHeader = (name: string, addresses?: string[]): void => {
    if (!addresses?.length) {
      return;
    }
    addresses.forEach((address) => assertSingleLineHeader(name, address));
    headers.push(`${name}: ${addresses.join(', ')}`);
  };

  addAddressHeader('To', to);
  addAddressHeader('Cc', cc);
  // Gmail honours a Bcc header in `raw` and strips it from the delivered copies.
  addAddressHeader('Bcc', bcc);

  assertSingleLineHeader('subject', subject);
  headers.push(`Subject: ${encodeHeaderValue(subject)}`);

  if (inReplyTo) {
    assertSingleLineHeader('In-Reply-To', inReplyTo);
    headers.push(`In-Reply-To: ${inReplyTo}`);
  }

  // Per RFC 5322 §3.6.4: carry forward the existing References chain and append
  // the message being replied to (if known). Emitted even when inReplyTo is absent
  // so the chain is preserved for messages that lack a Message-Id header.
  // assertSingleLineHeader guards against a crafted References value that contains
  // CRLF, which could inject arbitrary headers into the outgoing message.
  const refsChain = references
    ? inReplyTo
      ? `${references} ${inReplyTo}`
      : references
    : inReplyTo;
  if (refsChain) {
    if (references) {
      assertSingleLineHeader('References', references);
    }
    headers.push(`References: ${refsChain}`);
  }

  headers.push('MIME-Version: 1.0');
  headers.push(
    `Content-Type: ${bodyType === 'html' ? 'text/html' : 'text/plain'}; charset="UTF-8"`
  );
  headers.push('Content-Transfer-Encoding: base64');

  const message = `${headers.join('\r\n')}\r\n\r\n${encodeBody(body)}`;
  return Buffer.from(message, 'utf8').toString('base64url');
};

/**
 * Extracts a bare addr-spec from a formatted address header value.
 * `"Alice B" <alice@example.com>` → `alice@example.com`
 * A bare address passes through unchanged.
 */
export const extractAddrSpec = (headerValue: string): string => {
  const angled = /<([^<>]+)>/.exec(headerValue);
  return (angled ? angled[1] : headerValue).trim();
};

/**
 * Case-insensitive lookup over a Gmail message `payload.headers` array.
 * Gmail returns `Message-Id` on some messages and `Message-ID` on others.
 */
export const findHeader = (
  headers: Array<{ name?: string; value?: string }> | undefined,
  name: string
): string | undefined => {
  const lowerName = name.toLowerCase();
  return headers?.find((h) => h.name?.toLowerCase() === lowerName)?.value;
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

type SlackRecord = Record<string, unknown>;

/** Bounds the recursion into rich text nodes and into blocks nested in blocks. */
const MAX_DEPTH = 5;

/** Shorter lines are only treated as already present when `text` has them as a whole line. */
const MIN_CONTAINED_LINE_LENGTH = 20;

const isRecord = (value: unknown): value is SlackRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asRecords = (value: unknown): SlackRecord[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

const toLines = (value: string | undefined): string[] => (value === undefined ? [] : [value]);

const textObjectLines = (value: unknown): string[] =>
  toLines(isRecord(value) ? nonEmptyString(value.text) : undefined);

/** One bracketed line per button label, so a button reads as a control and not as message copy. */
const buttonLines = (elements: unknown): string[] =>
  asRecords(elements)
    .map((element) => (isRecord(element.text) ? nonEmptyString(element.text.text) : undefined))
    .filter((label): label is string => label !== undefined)
    .map((label) => `[${label}]`);

const richTextLeaf = (leaf: SlackRecord): string | undefined => {
  switch (leaf.type) {
    case 'link': {
      const url = nonEmptyString(leaf.url);
      const label = nonEmptyString(leaf.text);
      if (url === undefined) {
        return label;
      }
      return label === undefined ? `<${url}>` : `<${url}|${label}>`;
    }
    case 'user': {
      const userId = nonEmptyString(leaf.user_id);
      return userId === undefined ? undefined : `<@${userId}>`;
    }
    case 'usergroup': {
      const usergroupId = nonEmptyString(leaf.usergroup_id);
      return usergroupId === undefined ? undefined : `<!subteam^${usergroupId}>`;
    }
    case 'channel': {
      const channelId = nonEmptyString(leaf.channel_id);
      return channelId === undefined ? undefined : `<#${channelId}>`;
    }
    case 'broadcast': {
      const range = nonEmptyString(leaf.range);
      return range === undefined ? undefined : `<!${range}>`;
    }
    case 'emoji': {
      const name = nonEmptyString(leaf.name);
      return name === undefined ? undefined : `:${name}:`;
    }
    case 'date':
      return nonEmptyString(leaf.fallback);
    default:
      return typeof leaf.text === 'string' && leaf.text.length > 0 ? leaf.text : undefined;
  }
};

const richTextLines = (nodes: SlackRecord[], depth: number): string[] => {
  if (depth > MAX_DEPTH) {
    return [];
  }
  return nodes.flatMap((node) => {
    const children = asRecords(node.elements);
    const leaves = children.map(richTextLeaf).filter((leaf): leaf is string => leaf !== undefined);
    return leaves.length > 0 ? [leaves.join('')] : richTextLines(children, depth + 1);
  });
};

const tableCellText = (cell: SlackRecord): string => {
  if (cell.type === 'rich_text') {
    return richTextLines(asRecords(cell.elements), 0).join(' ');
  }
  if (typeof cell.value === 'number') {
    return String(cell.value);
  }
  return nonEmptyString(cell.text) ?? nonEmptyString(cell.value) ?? '';
};

const tableLines = (block: SlackRecord): string[] => [
  ...textObjectLines(block.caption),
  ...(Array.isArray(block.rows) ? block.rows : []).flatMap((row) => {
    const cells = Array.isArray(row) ? asRecords(row).map(tableCellText) : [];
    return cells.some((cell) => cell.length > 0) ? [cells.join(' | ')] : [];
  }),
];

const cardLines = (card: SlackRecord): string[] => [
  ...textObjectLines(card.title),
  ...textObjectLines(card.subtitle),
  ...textObjectLines(card.body),
  ...textObjectLines(card.subtext),
  ...buttonLines(card.actions),
];

const blockLines = (blocks: unknown, depth: number): string[] => {
  if (depth > MAX_DEPTH) {
    return [];
  }
  return asRecords(blocks).flatMap((block) => {
    switch (block.type) {
      case 'section':
        return [
          ...textObjectLines(block.text),
          ...asRecords(block.fields).flatMap((field) => textObjectLines(field)),
          ...(isRecord(block.accessory) && block.accessory.type === 'button'
            ? buttonLines([block.accessory])
            : []),
        ];
      case 'header':
        return textObjectLines(block.text);
      case 'markdown':
        return toLines(nonEmptyString(block.text));
      case 'video':
        return [...textObjectLines(block.title), ...textObjectLines(block.description)];
      case 'image':
        return [...toLines(nonEmptyString(block.alt_text)), ...textObjectLines(block.title)];
      case 'context':
        return asRecords(block.elements).flatMap((element) =>
          element.type === 'image'
            ? toLines(nonEmptyString(element.alt_text))
            : textObjectLines(element)
        );
      case 'actions':
        return buttonLines(block.elements);
      case 'rich_text':
        return richTextLines(asRecords(block.elements), 0);
      case 'table':
      case 'data_table':
        return tableLines(block);
      case 'card':
        return cardLines(block);
      case 'carousel':
        return asRecords(block.elements).flatMap(cardLines);
      case 'container':
        return [
          ...textObjectLines(block.title),
          ...textObjectLines(block.subtitle),
          ...blockLines(block.child_blocks, depth + 1),
        ];
      default:
        return [];
    }
  });
};

const attachmentFieldLines = (fields: unknown): string[] =>
  asRecords(fields).flatMap((field) => {
    const title = nonEmptyString(field.title)?.trim();
    const value = nonEmptyString(field.value)?.trim();
    if (title !== undefined && value !== undefined) {
      return [`${title}: ${value}`];
    }
    return toLines(value ?? title);
  });

/** The text of a message a legacy attachment forwards or unfurls: its blocks, else its text. */
const forwardedMessageLines = (messageBlocks: unknown): string[] =>
  asRecords(messageBlocks).flatMap(({ message }) => {
    if (!isRecord(message)) {
      return [];
    }
    const lines = blockLines(message.blocks, 1);
    return lines.length > 0 ? lines : toLines(nonEmptyString(message.text));
  });

const attachmentLines = (attachments: unknown): string[] =>
  asRecords(attachments).flatMap((attachment) => {
    const lines = [
      ...toLines(nonEmptyString(attachment.pretext)),
      ...toLines(nonEmptyString(attachment.title)),
      ...toLines(nonEmptyString(attachment.text)),
      ...attachmentFieldLines(attachment.fields),
      ...toLines(nonEmptyString(attachment.footer)),
      ...blockLines(attachment.blocks, 1),
      ...forwardedMessageLines(attachment.message_blocks),
    ];
    // `fallback` is the attachment's plain-text summary, so it only stands in when nothing else
    // carries content. https://docs.slack.dev/legacy/legacy-messaging/legacy-secondary-message-attachments/
    return lines.length > 0 ? lines : toLines(nonEmptyString(attachment.fallback));
  });

/** Collapses whitespace, unwraps `<url>`, and drops a leading list bullet or number. */
const normalize = (value: string): string =>
  value
    .replace(/<(https?:\/\/[^|>]+)>/g, '$1')
    .replace(/\s+/g, ' ')
    .replace(/^(?:[•◦▪‣-]|\d+\.) /, '')
    .trim();

/** Lowercase words separated by single spaces, for comparing against text Slack generated itself. */
const toWords = (value: string): string =>
  value
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 0)
    .join(' ');

/** Whether `words` holds `line` on word boundaries, so `node-1` is not found in `node-10`. */
const containsWords = (words: string, line: string): boolean =>
  ` ${words} `.includes(` ${toWords(line)} `);

/** Cuts to `maxLength` UTF-16 units without leaving half of a surrogate pair at the end. */
const cutText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) {
    return text;
  }
  const lastUnit = text.charCodeAt(maxLength - 1);
  const splitsPair = maxLength > 0 && lastUnit >= 0xd800 && lastUnit <= 0xdbff;
  return text.slice(0, splitsPair ? maxLength - 1 : maxLength);
};

/** The message's `text` plus the block and attachment lines it does not already contain. */
export const readSlackMessageText = (
  source: SlackRecord,
  maxLength: number
): string | undefined => {
  const baseText = nonEmptyString(source.text);
  const baseWords = toWords(baseText ?? '');
  const blocks = blockLines(source.blocks, 0);
  // `text` can already hold the blocks in another format, so the block lines are dropped together
  // once every one of them is in it. All or nothing: if a single block line is missing from
  // `text`, every block line is kept, trading some repetition for never losing a distinct line.
  const blocksAreInText =
    baseWords.length > 0 && blocks.every((line) => containsWords(baseWords, line));
  const baseLines = new Set((baseText?.split('\n') ?? []).map(normalize));
  const normalizedBase = normalize(baseText ?? '');
  const seen = new Set<string>();
  const extra = [...(blocksAreInText ? [] : blocks), ...attachmentLines(source.attachments)].filter(
    (line) => {
      const normalizedLine = normalize(line);
      if (normalizedLine.length === 0 || seen.has(normalizedLine)) {
        return false;
      }
      seen.add(normalizedLine);
      return !(
        baseLines.has(normalizedLine) ||
        (normalizedLine.length >= MIN_CONTAINED_LINE_LENGTH &&
          normalizedBase.includes(normalizedLine))
      );
    }
  );
  const text = [...toLines(baseText), ...extra].join('\n');
  return text.length === 0 ? undefined : cutText(text, maxLength);
};

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { deflateSync } from 'zlib';
import { between, pick, pickWeighted } from '../../edot_shared/random';
import { REPLAY_PAGE_SNAPSHOTS, type ReplayPageName } from './replay_page_snapshots';

/** rrweb's `EventType`. */
export const RRWEB_EVENT_TYPE = {
  FullSnapshot: 2,
  IncrementalSnapshot: 3,
  Meta: 4,
  Plugin: 6,
} as const;

// rrweb's `IncrementalSource` and `MouseInteractions`
const SOURCE_MUTATION = 0;
const SOURCE_MOUSE_MOVE = 1;
const SOURCE_MOUSE_INTERACTION = 2;
const SOURCE_SCROLL = 3;
const SOURCE_VIEWPORT_RESIZE = 4;
const SOURCE_INPUT = 5;
const MOUSE_UP = 0;
const MOUSE_DOWN = 1;
const MOUSE_CLICK = 2;

/** The id rrweb gives the document node, which scroll events of the page refer to. */
const DOCUMENT_NODE_ID = 1;

export type ReplaySize = 'light' | 'typical' | 'heavy';

export const REPLAY_SIZES: readonly ReplaySize[] = ['light', 'typical', 'heavy'];

interface ReplaySizeProfile {
  /** Bytes of one FullSnapshot, as JSON: the pages of a session draw from this range. */
  snapshotBytes: readonly [min: number, max: number];
  /** Incremental events per second while the page is open, apart from clicks. */
  eventsPerSecond: number;
  /** Elements one DOM mutation adds. */
  mutationElements: number;
}

/**
 * Sized after the POC measurements of a session's replay, uncompressed: about 50 KB, 0.5 MB and 4
 * to 5 MB for `light`, `typical` and `heavy`. Most of it is FullSnapshots (a page of a few
 * hundred nodes, a content-heavy page, a very large DOM), with the incremental events on top.
 */
const SIZE_PROFILES: Readonly<Record<ReplaySize, ReplaySizeProfile>> = {
  light: { snapshotBytes: [8_000, 30_000], eventsPerSecond: 2, mutationElements: 1 },
  typical: { snapshotBytes: [180_000, 400_000], eventsPerSecond: 8, mutationElements: 3 },
  heavy: { snapshotBytes: [1_950_000, 4_050_000], eventsPerSecond: 16, mutationElements: 8 },
};

const SNAPSHOT_VARIANTS = 8;
const FILLER_TEXT =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

/** An rrweb event as the recorder serializes it, with the rrweb event type kept apart. */
export interface ReplayRrwebEvent {
  type: number;
  timestamp: number;
  /** The event as JSON: what goes into the body of the log record. */
  json: string;
}

interface PageSnapshot {
  /** The `data` of the FullSnapshot event, as JSON. */
  dataJson: string;
  /** Highest node id of the snapshot, new nodes of mutations count on from it. */
  maxId: number;
  /** Elements that clicks and the pointer land on. */
  targetIds: readonly number[];
  /** Elements that take children. */
  containerIds: readonly number[];
  inputIds: readonly number[];
}

interface SnapshotNode {
  type: number;
  id: number;
  tagName?: string;
  attributes?: Record<string, string>;
  textContent?: string;
  childNodes?: SnapshotNode[];
}

const NON_VISIBLE_TAGS: ReadonlySet<string> = new Set([
  'html',
  'head',
  'body',
  'meta',
  'title',
  'style',
  'link',
  'script',
]);
const CONTAINER_TAGS: ReadonlySet<string> = new Set([
  'div',
  'section',
  'main',
  'ul',
  'ol',
  'tbody',
  'article',
  'p',
  'li',
  'span',
  'header',
  'nav',
  'td',
]);
const INPUT_TAGS: ReadonlySet<string> = new Set(['input', 'textarea', 'select']);

const walk = (node: SnapshotNode, visit: (node: SnapshotNode) => void) => {
  visit(node);
  node.childNodes?.forEach((child) => walk(child, visit));
};

const fillerCard = (firstId: number, index: number): SnapshotNode => ({
  type: 2,
  id: firstId,
  tagName: 'div',
  attributes: { class: 'card' },
  childNodes: [
    {
      type: 2,
      id: firstId + 1,
      tagName: 'h3',
      attributes: {},
      childNodes: [{ type: 3, id: firstId + 2, textContent: `Item ${index + 1}` }],
    },
    {
      type: 2,
      id: firstId + 3,
      tagName: 'p',
      attributes: { class: 'summary' },
      childNodes: [
        {
          type: 3,
          id: firstId + 4,
          textContent: `${FILLER_TEXT} ${FILLER_TEXT.slice(index % 40)}`,
        },
      ],
    },
  ],
});
const FILLER_CARD_NODES = 5;

const snapshotCache = new Map<string, PageSnapshot>();

/**
 * A page's snapshot padded with cards of the page's own look to about `targetBytes`. Built once per
 * page and size: sessions share the serialized snapshot, which keeps generating replay cheap.
 */
const getPageSnapshot = (page: ReplayPageName, targetBytes: number): PageSnapshot => {
  const key = `${page}:${targetBytes}`;
  const cached = snapshotCache.get(key);
  if (cached) {
    return cached;
  }

  const { snapshotJson } = REPLAY_PAGE_SNAPSHOTS[page];
  const data: { node: SnapshotNode } = JSON.parse(snapshotJson);
  const targetIds: number[] = [];
  const containerIds: number[] = [];
  const inputIds: number[] = [];
  const bodies: SnapshotNode[] = [];
  let maxId = 0;
  walk(data.node, (node) => {
    maxId = Math.max(maxId, node.id);
    const { tagName } = node;
    if (node.type !== 2 || tagName === undefined) {
      return;
    }
    if (tagName === 'body') {
      bodies.push(node);
    }
    if (INPUT_TAGS.has(tagName)) {
      inputIds.push(node.id);
    }
    if (!NON_VISIBLE_TAGS.has(tagName)) {
      targetIds.push(node.id);
    }
    if (CONTAINER_TAGS.has(tagName)) {
      containerIds.push(node.id);
    }
  });

  const cardBytes = JSON.stringify(fillerCard(maxId + 1, 0)).length + 40;
  const cardCount = Math.max(0, Math.ceil((targetBytes - snapshotJson.length) / cardBytes));
  const [body] = bodies;
  if (body?.childNodes) {
    for (let i = 0; i < cardCount; i++) {
      body.childNodes.push(fillerCard(maxId + 1 + i * FILLER_CARD_NODES, i));
    }
  }

  const snapshot: PageSnapshot = {
    dataJson: cardCount > 0 ? JSON.stringify(data) : snapshotJson,
    maxId: maxId + cardCount * FILLER_CARD_NODES,
    targetIds,
    containerIds,
    inputIds,
  };
  snapshotCache.set(key, snapshot);
  return snapshot;
};

export interface ReplaySegmentPlan {
  page: ReplayPageName;
  /** Address of the page, which the Meta event carries. */
  url: string;
  viewport: { width: number; height: number };
  /** The segment's events stay within `[start, end]`. */
  start: number;
  end: number;
  size: ReplaySize;
  random: () => number;
  /** The recorder stores a FullSnapshot this often while recording (`checkoutIntervalMs`). */
  checkoutIntervalMs?: number;
  /** Takes a FullSnapshot at this time, on top of the periodic ones. */
  checkoutAt?: number;
  /** Makes the first FullSnapshot at least this big. */
  minSnapshotBytes?: number;
  clickTimes?: readonly number[];
  exceptionTimes?: readonly number[];
}

// The recorder's default `checkoutIntervalMs`
export const DEFAULT_CHECKOUT_INTERVAL_MS = 300_000;
// A page that stays open for hours doesn't produce events for ever: the recorder pauses when the
// tab is hidden, and the segment of a document is capped here
const MAX_INCREMENTAL_EVENTS = 20_000;

const metaEvent = (
  timestamp: number,
  href: string,
  { width, height }: { width: number; height: number }
): ReplayRrwebEvent => ({
  type: RRWEB_EVENT_TYPE.Meta,
  timestamp,
  json: JSON.stringify({ type: RRWEB_EVENT_TYPE.Meta, data: { href, width, height }, timestamp }),
});

const fullSnapshotEvent = (timestamp: number, { dataJson }: PageSnapshot): ReplayRrwebEvent => ({
  type: RRWEB_EVENT_TYPE.FullSnapshot,
  timestamp,
  json: `{"type":${RRWEB_EVENT_TYPE.FullSnapshot},"data":${dataJson},"timestamp":${timestamp}}`,
});

const incrementalEvent = (timestamp: number, data: Record<string, unknown>): ReplayRrwebEvent => ({
  type: RRWEB_EVENT_TYPE.IncrementalSnapshot,
  timestamp,
  json: JSON.stringify({ type: RRWEB_EVENT_TYPE.IncrementalSnapshot, data, timestamp }),
});

type Slot =
  | { time: number; kind: 'mousemove' | 'scroll' | 'mutation' | 'input' | 'resize' | 'click' }
  | { time: number; kind: 'checkout' }
  | { time: number; kind: 'exception' };

const INCREMENTAL_WEIGHTS: ReadonlyArray<readonly [Slot['kind'], number]> = [
  ['mousemove', 50],
  ['scroll', 12],
  ['mutation', 28],
  ['input', 6],
  ['resize', 1],
];

/**
 * The rrweb events of one segment, in recording order: a Meta and a FullSnapshot, then the events
 * of a visitor reading, scrolling and clicking, with DOM mutations that add and remove elements, a
 * FullSnapshot every checkout interval and a console error event where the page throws. The
 * pointer and the clicks land on elements of the snapshot, so the segment plays.
 */
export const buildSegmentEvents = ({
  page,
  url,
  viewport,
  start,
  end,
  size,
  random,
  checkoutIntervalMs = DEFAULT_CHECKOUT_INTERVAL_MS,
  checkoutAt,
  minSnapshotBytes = 0,
  clickTimes = [],
  exceptionTimes = [],
}: ReplaySegmentPlan): ReplayRrwebEvent[] => {
  const profile = SIZE_PROFILES[size];
  const [minBytes, maxBytes] = profile.snapshotBytes;
  const variant = Math.floor(random() * SNAPSHOT_VARIANTS);
  const targetBytes = Math.max(
    Math.round(minBytes + ((maxBytes - minBytes) * variant) / (SNAPSHOT_VARIANTS - 1)),
    minSnapshotBytes
  );
  const snapshot = getPageSnapshot(page, targetBytes);
  const inRange = (time: number) => Math.min(Math.max(Math.floor(time), start + 1), end);

  const duration = Math.max(end - start, 0);
  const incrementalCount = Math.min(
    Math.round((profile.eventsPerSecond * duration) / 1000),
    MAX_INCREMENTAL_EVENTS
  );
  const slots: Slot[] = [
    ...Array.from({ length: incrementalCount }, (): Slot => {
      const kind = pickWeighted(
        random,
        INCREMENTAL_WEIGHTS.filter(
          ([slotKind]) => slotKind !== 'input' || snapshot.inputIds.length
        ),
        ([, weight]) => weight
      )[0];
      return { time: inRange(between(random, start, end)), kind } as Slot;
    }),
    ...clickTimes.map((time): Slot => ({ time: inRange(time), kind: 'click' })),
    ...exceptionTimes.map((time): Slot => ({ time: inRange(time), kind: 'exception' })),
  ];
  for (let time = start + checkoutIntervalMs; time < end; time += checkoutIntervalMs) {
    slots.push({ time, kind: 'checkout' });
  }
  if (checkoutAt !== undefined && checkoutAt > start && checkoutAt < end) {
    slots.push({ time: checkoutAt, kind: 'checkout' });
  }
  // Stable: the order of equal times is the order they were added in
  slots.sort((a, b) => a.time - b.time);

  const events: ReplayRrwebEvent[] = [
    metaEvent(start, url, viewport),
    fullSnapshotEvent(start, snapshot),
  ];
  let nextNodeId = snapshot.maxId + 1;
  let added: Array<{ parentId: number; id: number }> = [];
  let scrollY = 0;
  let pointer = { x: Math.round(viewport.width / 2), y: Math.round(viewport.height / 3) };
  const targetId = () => pick(random, snapshot.targetIds);

  slots.forEach((slot) => {
    const { time } = slot;
    switch (slot.kind) {
      case 'checkout':
        added = [];
        nextNodeId = snapshot.maxId + 1;
        events.push(metaEvent(time, url, viewport), fullSnapshotEvent(time, snapshot));
        break;
      case 'mousemove': {
        const count = 1 + Math.floor(random() * 6);
        const positions = Array.from({ length: count }, (_, i) => {
          pointer = {
            x: Math.min(
              Math.max(Math.round(pointer.x + between(random, -80, 80)), 0),
              viewport.width
            ),
            y: Math.min(
              Math.max(Math.round(pointer.y + between(random, -60, 60)), 0),
              viewport.height
            ),
          };
          return { ...pointer, id: targetId(), timeOffset: -(count - 1 - i) * 50 };
        });
        events.push(incrementalEvent(time, { source: SOURCE_MOUSE_MOVE, positions }));
        break;
      }
      case 'scroll':
        scrollY = Math.max(0, Math.round(scrollY + between(random, -300, 600)));
        events.push(
          incrementalEvent(time, { source: SOURCE_SCROLL, id: DOCUMENT_NODE_ID, x: 0, y: scrollY })
        );
        break;
      case 'click': {
        const id = targetId();
        const { x, y } = pointer;
        events.push(
          incrementalEvent(time, { source: SOURCE_MOUSE_INTERACTION, type: MOUSE_DOWN, id, x, y }),
          incrementalEvent(time + 1, {
            source: SOURCE_MOUSE_INTERACTION,
            type: MOUSE_UP,
            id,
            x,
            y,
          }),
          incrementalEvent(time + 1, {
            source: SOURCE_MOUSE_INTERACTION,
            type: MOUSE_CLICK,
            id,
            x,
            y,
            pointerType: 0,
          })
        );
        break;
      }
      case 'mutation': {
        const removes = added.length > 0 && random() < 0.4 ? added.splice(-1) : [];
        const adds = Array.from({ length: profile.mutationElements }, () => {
          const parentId = pick(random, snapshot.containerIds);
          const id = nextNodeId;
          nextNodeId += 2;
          added.push({ parentId, id });
          return {
            parentId,
            nextId: null,
            node: {
              type: 2,
              tagName: 'span',
              attributes: { class: 'badge' },
              childNodes: [{ type: 3, textContent: `${Math.floor(random() * 1000)}`, id: id + 1 }],
              id,
            },
          };
        });
        events.push(
          incrementalEvent(time, {
            source: SOURCE_MUTATION,
            texts: [],
            attributes: [],
            removes,
            adds,
          })
        );
        break;
      }
      case 'input':
        // Inputs are masked by default (`maskAllInputs`)
        events.push(
          incrementalEvent(time, {
            source: SOURCE_INPUT,
            text: '*'.repeat(1 + Math.floor(random() * 18)),
            isChecked: false,
            id: pick(random, snapshot.inputIds),
          })
        );
        break;
      case 'resize':
        events.push(
          incrementalEvent(time, {
            source: SOURCE_VIEWPORT_RESIZE,
            width: viewport.width,
            height: Math.max(viewport.height - Math.floor(between(random, 0, 120)), 200),
          })
        );
        break;
      case 'exception':
        // The console recording plugin of rrweb
        events.push({
          type: RRWEB_EVENT_TYPE.Plugin,
          timestamp: time,
          json: JSON.stringify({
            type: RRWEB_EVENT_TYPE.Plugin,
            data: {
              plugin: 'rrweb/console@1',
              payload: { level: 'error', trace: [], payload: ['"Uncaught exception"'] },
            },
            timestamp: time,
          }),
        });
        break;
    }
  });

  return events;
};

// The format mark of `@rrweb/packer`, which it writes into every packed event as `v`
const PACKER_MARK = 'v1';

/**
 * What `@rrweb/packer` makes of an event: the event with the packer's mark, deflated, as a string
 * of one character per byte. Consumers unpack it with the same package.
 */
export const packEventJson = (json: string): string =>
  deflateSync(Buffer.from(`${json.slice(0, -1)},"v":"${PACKER_MARK}"}`, 'utf8')).toString('latin1');

/**
 * Splits a body into pieces of at most `maxBytes` bytes of UTF-8, never inside a character, like
 * the recorder does before it exports a large event. A body that fits is returned as it is.
 */
export const splitIntoChunks = (body: string, maxBytes: number): string[] => {
  if (Buffer.byteLength(body, 'utf8') <= maxBytes) {
    return [body];
  }
  // The longest UTF-8 character is 4 bytes
  const limit = Math.max(maxBytes, 4);
  const bytes = Buffer.from(body, 'utf8');
  const chunks: string[] = [];
  let position = 0;
  while (position < bytes.length) {
    let chunkEnd = Math.min(position + limit, bytes.length);
    // Back off to the start of a character: continuation bytes are 0b10xxxxxx
    while (chunkEnd < bytes.length && bytes[chunkEnd] >= 0x80 && bytes[chunkEnd] < 0xc0) {
      chunkEnd--;
    }
    chunks.push(bytes.toString('utf8', position, chunkEnd));
    position = chunkEnd;
  }
  return chunks;
};

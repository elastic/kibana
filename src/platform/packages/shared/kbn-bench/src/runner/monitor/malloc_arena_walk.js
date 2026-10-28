/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TEMPORARY diagnostic, do not merge: walks the glibc main-arena heap (`[heap]`, the brk area)
// chunk by chunk through /proc/self/mem and splits it into live chunks, free chunks and the top
// chunk, like `malloc_info` would, without needing gdb or a compiler. Linux/glibc 64-bit only.

const fs = require('fs');

const WINDOW_BYTES = 2 * 1024 * 1024;
const SIZE_FIELD_OFFSET = 8;
const CHUNK_HEADER_BYTES = 16;
const MIN_CHUNK_BYTES = 32;
const CHUNK_ALIGNMENT = 16;
// Low 3 bits of a chunk's size field: PREV_INUSE (1), IS_MMAPPED (2), NON_MAIN_ARENA (4).
const FLAG_BITS = 8;
const UINT32_RANGE = 4294967296;
const MAX_FIRST_CHUNK_SHIFT = 4096;
const MAX_TOP_OVERRUN_BYTES = 16 * 1024 * 1024;
const MIN_CHUNKS_BEFORE_TOP = 64;
const TOP_N = 5;
const BUCKET_LIMITS = [32, 64, 128, 256, 512, 1024, 4096, 16384, 65536, 262144, 1048576];
const BUCKET_LABELS = [
  ...BUCKET_LIMITS.map((limit) => `<=${limit}`),
  `>${BUCKET_LIMITS[BUCKET_LIMITS.length - 1]}`,
];

const toMib = (bytes) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

let scratch;

const bucketIndexOf = (size) => {
  const index = BUCKET_LIMITS.findIndex((limit) => size <= limit);
  return index === -1 ? BUCKET_LIMITS.length : index;
};

const createSideStats = () => ({
  count: 0,
  bytes: 0,
  bucketCounts: new Array(BUCKET_LABELS.length).fill(0),
  bucketBytes: new Array(BUCKET_LABELS.length).fill(0),
  largest: [],
});

const record = (stats, size) => {
  const bucket = bucketIndexOf(size);
  stats.count += 1;
  stats.bytes += size;
  stats.bucketCounts[bucket] += 1;
  stats.bucketBytes[bucket] += size;

  const { largest } = stats;
  if (largest.length < TOP_N || size > largest[largest.length - 1]) {
    largest.push(size);
    largest.sort((a, b) => b - a);
    if (largest.length > TOP_N) largest.pop();
  }
};

const describeSide = (stats) => ({
  count: stats.count,
  mib: toMib(stats.bytes),
  bySize: BUCKET_LABELS.map((label, index) => ({
    upToBytes: label,
    count: stats.bucketCounts[index],
    mib: toMib(stats.bucketBytes[index]),
  })).filter((bucket) => bucket.count > 0),
  largestKib: stats.largest.map((size) => Math.round(size / 1024)),
});

const findHeapRange = () => {
  const line = fs
    .readFileSync('/proc/self/maps', 'utf8')
    .split('\n')
    .find((candidate) => candidate.endsWith('[heap]'));
  const match = line && /^([0-9a-f]+)-([0-9a-f]+)\s/.exec(line);
  // User-space addresses are below 2^47, so they are exact in a double.
  return match ? { start: parseInt(match[1], 16), end: parseInt(match[2], 16) } : undefined;
};

const walkFrom = (fd, heap, shift) => {
  const inUse = createSideStats();
  const free = createSideStats();
  let addr = heap.start + shift;
  let windowStart = 0;
  let windowEnd = 0;
  let previousSize = 0;
  let topBytes = 0;
  let chunks = 0;

  const outcome = (ok, reason, detail) => ({
    ok,
    reason,
    detail,
    shift,
    chunks,
    walkedBytes: addr - heap.start,
    inUse,
    free,
    topBytes,
  });

  while (addr < heap.end) {
    if (addr + CHUNK_HEADER_BYTES > windowEnd || addr < windowStart) {
      const length = Math.min(scratch.length, heap.end - addr);
      const bytesRead = fs.readSync(fd, scratch, 0, length, addr);
      if (bytesRead < CHUNK_HEADER_BYTES) return outcome(false, 'short_read');
      windowStart = addr;
      windowEnd = addr + bytesRead;
    }

    const fieldOffset = addr - windowStart + SIZE_FIELD_OFFSET;
    const low = scratch.readUInt32LE(fieldOffset);
    const high = scratch.readUInt32LE(fieldOffset + 4);
    const flags = low % FLAG_BITS;
    const size = low - flags + high * UINT32_RANGE;

    // Our own allocations can grow the brk heap after the range was read, so the top chunk may
    // legitimately extend a little past the snapshot.
    const overrunBytes = addr + size - heap.end;
    const isTopChunk =
      overrunBytes >= 0 && overrunBytes <= MAX_TOP_OVERRUN_BYTES && chunks >= MIN_CHUNKS_BEFORE_TOP;
    const isValid =
      size >= MIN_CHUNK_BYTES &&
      size % CHUNK_ALIGNMENT === 0 &&
      (overrunBytes <= 0 || isTopChunk) &&
      flags < 2;
    if (!isValid) {
      return outcome(false, 'invalid_chunk', {
        offsetBytes: addr - heap.start,
        remainingBytes: heap.end - addr,
        size,
        flags,
      });
    }

    // A chunk's PREV_INUSE bit says whether the chunk right before it is allocated.
    if (previousSize > 0) {
      record(flags % 2 === 1 ? inUse : free, previousSize);
    }
    chunks += 1;
    if (overrunBytes >= 0) {
      topBytes = heap.end - addr;
      addr = heap.end;
      previousSize = 0;
    } else {
      addr += size;
      previousSize = size;
    }
  }
  return outcome(true);
};

const walkMainArenaHeap = () => {
  const startedAt = Date.now();
  // Allocated before reading the heap range so our own allocation can't move the heap end.
  scratch = scratch ?? Buffer.allocUnsafeSlow(WINDOW_BYTES);

  const heap = findHeapRange();
  if (!heap) return { ok: false, reason: 'no_heap_mapping' };

  const fd = fs.openSync('/proc/self/mem', 'r');
  try {
    let best;
    for (let shift = 0; shift <= MAX_FIRST_CHUNK_SHIFT; shift += CHUNK_ALIGNMENT) {
      const attempt = walkFrom(fd, heap, shift);
      if (!best || attempt.walkedBytes > best.walkedBytes) best = attempt;
      if (attempt.ok) break;
    }

    return {
      ok: best.ok,
      reason: best.reason,
      detail: best.detail,
      firstChunkShift: best.shift,
      heapMiB: toMib(heap.end - heap.start),
      walkedMiB: toMib(best.walkedBytes),
      chunks: best.chunks,
      topMiB: toMib(best.topBytes),
      inUse: describeSide(best.inUse),
      free: describeSide(best.free),
      walkMs: Date.now() - startedAt,
    };
  } finally {
    fs.closeSync(fd);
  }
};

module.exports = { walkMainArenaHeap };

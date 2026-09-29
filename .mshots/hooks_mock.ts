/**
 * Stub for the memory hooks. The harness sets `window.__memoryScenario`, and
 * these read from it, so the real component code is exercised unchanged.
 */
type Row = Record<string, any>;

const base = (o: Row = {}): Row => ({
  id: 'memory_kafka-consumer-lag',
  slug: 'kafka-consumer-lag',
  title: 'Kafka consumer lag on checkout events',
  description: 'The checkout consumer group falls behind during flash sales',
  content:
    '## Observation\n\nThe `checkout-events` consumer group reports growing lag during promotions.\n\n## Resolution\n\nScale the group to 12 partitions and raise `max.poll.records`.',
  context: 'Checkout latency spiked during the Black Friday promotion',
  tags: ['memory', 'kafka', 'operations'],
  archived: false,
  categories: ['operations'],
  references: ['https://runbooks.example/kafka-lag'],
  created_at: '2026-01-04T00:00:00.000Z',
  updated_at: '2026-03-18T00:00:00.000Z',
  created_by: 'nightshift-optimizer',
  updated_by: 'nightshift-optimizer',
  telemetry: { impressions: 42, conversions: 31, last_impression_time: '2026-03-18T00:00:00.000Z' },
  usefulness: 0.74,
  confidence: 0.91,
  ...o,
});

const rowsFor = (scenario: string): Row[] => {
  if (scenario === 'empty') return [];
  return [
    base(),
    base({
      id: 'memory_redis-evictions',
      slug: 'redis-evictions',
      title: 'Redis evictions under the checkout cache',
      context: 'Cache hit rate collapsed during the promotion',
      tags: ['memory', 'redis'],
      usefulness: 0.31,
      confidence: 0.42,
      updated_at: '2026-03-11T00:00:00.000Z',
    }),
    base({
      id: 'memory_es-cluster-lag',
      slug: 'es-cluster-lag',
      title: 'Data stream lag when nightly jobs overlap',
      context: 'The nightly aggregation overlapped with a reindex',
      tags: ['memory', 'elasticsearch'],
      usefulness: 0.88,
      confidence: 0.66,
      updated_at: '2026-02-02T00:00:00.000Z',
    }),
    base({
      id: 'memory_wrong-dns',
      slug: 'wrong-dns',
      title: 'Attribution to DNS was wrong',
      tags: ['memory'],
      archived: true,
      archive_reason: 'harmful',
      usefulness: 0,
      confidence: 0,
      updated_at: '2026-01-20T00:00:00.000Z',
    }),
  ];
};

const scenario = (): string =>
  (globalThis as any).__memoryScenario ?? 'populated';

export const useMemoryEnabled = () => true;

export const useMemoryPages = (filter: 'all' | 'active' | 'archived' = 'all') => {
  // Honour the filter the way the real hook does by asking the server, so the
  // sidebar's filter buttons can be exercised in the browser.
  const all = rowsFor(scenario());
  const rows = all.filter((r) =>
    filter === 'all' ? true : filter === 'archived' ? r.archived : !r.archived
  );
  return {
    rows,
    total: rows.length,
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: () => {},
    stats: {
      total: rows.length,
      archived: rows.filter((r) => r.archived).length,
      decayed_impressions: rows.length * 12,
      decayed_conversions: rows.length * 7,
    },
  };
};

export const useMemoryPage = () => {
  const rows = rowsFor(scenario());
  return {
    isLoading: false,
    isError: false,
    data: rows.length > 0 ? { page: rows[0], usefulness: 0.74, confidence: 0.91 } : undefined,
  };
};

export const useSetMemoryArchived = () => async () => {};
export const useDeleteMemoryPage = () => async () => {};

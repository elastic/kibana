# Go Sidecar Proxy Overhead Benchmark

## Test Parameters

| Parameter | Value |
|-----------|-------|
| Tool | wrk |
| Duration | 30s per test |
| Threads | 4 (capped to connection count when c < 4) |
| Endpoint | `GET /api/benchmark?size=N` |
| URL | `http://localhost:5601` |
| Concurrency levels | 1, 10, 50, 100 |
| Response sizes | 100B, 1KB, 10KB, 100KB, 1MB |

---

## Run 1: Before `DisableCompression` fix (with per-request logging)

### Baseline — Direct to Node (no sidecar)

#### Throughput (req/s)

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 4,582 | 4,942 | 4,934 | 4,910 |
| 1KB | 4,619 | 4,972 | 4,978 | 4,894 |
| 10KB | 4,554 | 4,822 | 4,763 | 4,707 |
| 100KB | 2,997 | 3,495 | 3,466 | 3,463 |
| 1MB | 803 | 1,006 | 1,046 | 988 |

#### Latency p50

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 173us | 1.25ms | 8.24ms | 20.45ms |
| 1KB | 174us | 1.25ms | 8.05ms | 20.51ms |
| 10KB | 177us | 1.18ms | 8.45ms | 21.12ms |
| 100KB | 277us | 1.64ms | 11.45ms | 28.01ms |
| 1MB | 1.08ms | 5.95ms | 40.96ms | 99.53ms |

#### Latency p99

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 4.86ms | 6.56ms | 24.81ms | 62.86ms |
| 1KB | 4.02ms | 6.53ms | 24.70ms | 60.77ms |
| 10KB | 3.96ms | 6.66ms | 24.11ms | 61.03ms |
| 100KB | 50.83ms | 51.59ms | 79.08ms | 266.66ms |
| 1MB | 13.15ms | 21.54ms | 111.04ms | 342.76ms |

### Proxied — Through Go Sidecar (before fix)

#### Throughput (req/s)

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 3,232 | 4,556 | 4,511 | 4,487 |
| 1KB | 2,684 | 3,770 | 3,808 | 3,726 |
| 10KB | 2,072 | 3,438 | 3,567 | 3,483 |
| 100KB | 516 | 1,830 | 2,241 | 2,170 |
| 1MB | 59 | 208 | 235 | 246 |

#### Latency p50

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 262us | 1.28ms | 9.04ms | 22.25ms |
| 1KB | 308us | 1.68ms | 12.51ms | 25.51ms |
| 10KB | 417us | 1.92ms | 13.75ms | 26.79ms |
| 100KB | 1.84ms | 3.74ms | 19.68ms | 41.47ms |
| 1MB | 16.04ms | 36.12ms | 199.61ms | 396.10ms |

#### Latency p99

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 4.08ms | 6.65ms | 26.13ms | 93.58ms |
| 1KB | 5.12ms | 11.78ms | 32.48ms | 56.68ms |
| 10KB | 5.16ms | 14.40ms | 36.01ms | 59.25ms |
| 100KB | 8.62ms | 24.93ms | 59.80ms | 94.60ms |
| 1MB | 26.85ms | 51.29ms | 260.51ms | 781.56ms |

### Profiling finding

CPU profile (100KB, c=50) showed **64% of CPU time** in `net/http.(*gzipReader).Read` — Go's default transport was decompressing gzip responses from Node before re-sending them. Fix: `DisableCompression: true` on the proxy transport.

---

## Run 2: After `DisableCompression` fix (still with per-request logging)

### Baseline — Direct to Node (no sidecar)

#### Throughput (req/s)

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 4,637 | 5,014 | 5,019 | 4,952 |
| 1KB | 4,671 | 4,988 | 4,997 | 4,908 |
| 10KB | 4,582 | 4,832 | 4,788 | 4,691 |
| 100KB | 2,986 | 3,506 | 3,458 | 3,426 |
| 1MB | 802 | 1,004 | 1,038 | 988 |

#### Latency p50

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 172us | 1.23ms | 7.95ms | 20.38ms |
| 1KB | 172us | 1.24ms | 7.99ms | 20.47ms |
| 10KB | 175us | 1.18ms | 8.33ms | 21.15ms |
| 100KB | 279us | 1.63ms | 11.46ms | 28.18ms |
| 1MB | 1.08ms | 5.91ms | 42.09ms | 99.47ms |

#### Latency p99

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 5.26ms | 6.38ms | 24.17ms | 61.82ms |
| 1KB | 4.12ms | 6.46ms | 24.57ms | 61.93ms |
| 10KB | 4.17ms | 6.53ms | 24.06ms | 60.97ms |
| 100KB | 46.79ms | 51.89ms | 81.76ms | 299.16ms |
| 1MB | 13.26ms | 21.08ms | 151.45ms | 318.88ms |

### Proxied — Through Go Sidecar (after DisableCompression fix)

#### Throughput (req/s)

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 3,167 | 4,454 | 4,395 | 4,390 |
| 1KB | 3,150 | 4,366 | 4,372 | 4,361 |
| 10KB | 3,062 | 3,971 | 3,972 | 3,934 |
| 100KB | 1,972 | 2,260 | 2,591 | 2,667 |
| 1MB | 287 | 523 | 741 | 768 |

#### Latency p50

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 266us | 1.31ms | 9.33ms | 22.68ms |
| 1KB | 270us | 1.35ms | 9.32ms | 22.89ms |
| 10KB | 278us | 1.64ms | 11.24ms | 24.80ms |
| 100KB | 438us | 3.19ms | 18.01ms | 36.26ms |
| 1MB | 1.80ms | 14.63ms | 63.79ms | 129.44ms |

#### Latency p99

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 4.27ms | 6.81ms | 26.41ms | 64.06ms |
| 1KB | 3.87ms | 6.87ms | 23.29ms | 68.39ms |
| 10KB | 3.58ms | 6.25ms | 21.89ms | 55.31ms |
| 100KB | 30.32ms | 36.92ms | 79.07ms | 113.09ms |
| 1MB | 14.55ms | 28.13ms | 106.59ms | 219.94ms |

### Overhead Summary (Run 2)

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | -32% | -11% | -12% | -11% |
| 1KB | -33% | -12% | -13% | -11% |
| 10KB | -33% | -18% | -17% | -16% |
| 100KB | -34% | -36% | -25% | -22% |
| 1MB | -64% | -48% | -29% | -22% |

### p50 Latency Overhead (c=1)

| Size | Direct | Proxied | Overhead |
|------|--------|---------|----------|
| 100B | 172us | 266us | +94us |
| 1KB | 172us | 270us | +98us |
| 10KB | 175us | 278us | +103us |
| 100KB | 279us | 438us | +159us |
| 1MB | 1.08ms | 1.80ms | +720us |

---

## Run 3: After `DisableCompression` fix + per-request logging removed

### Proxied — Through Go Sidecar (no logging)

Uses the same baseline as Run 2.

#### Throughput (req/s)

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 3,329 | 4,605 | 4,533 | 4,518 |
| 1KB | 3,302 | 4,486 | 4,481 | 4,451 |
| 10KB | 3,206 | 4,120 | 4,081 | 4,063 |
| 100KB | 2,017 | 2,285 | 2,682 | 2,726 |
| 1MB | 278 | 537 | 742 | 750 |

#### Latency p50

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 255us | 1.26ms | 8.97ms | 22.13ms |
| 1KB | 256us | 1.32ms | 9.07ms | 22.49ms |
| 10KB | 263us | 1.57ms | 10.79ms | 24.20ms |
| 100KB | 426us | 3.15ms | 17.42ms | 35.51ms |
| 1MB | 1.85ms | 14.30ms | 64.22ms | 131.12ms |

#### Latency p99

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | 3.90ms | 6.76ms | 26.40ms | 65.57ms |
| 1KB | 3.88ms | 7.17ms | 22.89ms | 62.85ms |
| 10KB | 3.66ms | 6.66ms | 23.65ms | 53.42ms |
| 100KB | 34.89ms | 41.15ms | 80.45ms | 111.46ms |
| 1MB | 16.54ms | 26.78ms | 105.70ms | 197.72ms |

### Overhead Summary (Run 3 proxied vs Direct to Node, no sidecar)

| Size | c=1 | c=10 | c=50 | c=100 |
|------|-----|------|------|-------|
| 100B | -28% | -8% | -10% | -9% |
| 1KB | -29% | -10% | -10% | -9% |
| 10KB | -30% | -15% | -15% | -13% |
| 100KB | -32% | -35% | -22% | -20% |
| 1MB | -65% | -47% | -29% | -24% |

### p50 Latency Overhead (c=1)

| Size | Direct | Proxied | Overhead |
|------|--------|---------|----------|
| 100B | 172us | 255us | +83us |
| 1KB | 172us | 256us | +84us |
| 10KB | 175us | 263us | +88us |
| 100KB | 279us | 426us | +147us |
| 1MB | 1.08ms | 1.85ms | +770us |

### Impact of removing logging (Run 3 vs Run 2, proxied only)

Removing per-request `log.Printf` gained ~2-5% throughput on small payloads (e.g. 100B c=10: 4,454 → 4,605). Large payloads unchanged — bottleneck is the copy path, not logging.

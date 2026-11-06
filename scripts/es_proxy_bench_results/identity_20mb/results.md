# Kibana vs direct Elasticsearch (ES|QL async)

## Throughput change (Kibana vs direct ES)

| Size | c=1 | c=10 | c=50 | c=100 |
|---|---|---|---|---|
| 20MB | -9% | -47% | -2% | -6% |

## p50 latency in ms (direct ES → Kibana)

| Size | c=1 | c=10 | c=50 | c=100 |
|---|---|---|---|---|
| 20MB | 117.2 → 130.0 | 155.6 → 296.0 | 548.4 → 572.6 | 1040.0 → 1220.0 |

## p99 latency in ms (direct ES → Kibana)

| Size | c=1 | c=10 | c=50 | c=100 |
|---|---|---|---|---|
| 20MB | 126.9 → 137.1 | 170.7 → 347.2 | 965.5 → 993.2 | 2090.0 → 1790.0 |

Response bytes (uncompressed / gzip on the wire):

| Size | Direct ES | Kibana |
|---|---|---|
| 20MB | 20972209 / 20972209 | 20972210 / 20972209 |

## 20MB

| Conns | Direct req/s | Kibana req/s | Throughput change | Direct p50 / p99 (ms) | Kibana p50 / p99 (ms) | Kibana RSS avg / peak (MB) | Errors (direct / kibana) |
|---|---|---|---|---|---|---|---|
| 1 | 8.4 | 7.7 | -9% | 117.2 / 126.9 | 130.0 / 137.1 | 1072 / 1075 | 0 / 0 |
| 10 | 65.5 | 34.7 | -47% | 155.6 / 170.7 | 296.0 / 347.2 | 1466 / 1503 | 0 / 0 |
| 50 | 81.3 | 79.3 | -2% | 548.4 / 965.5 | 572.6 / 993.2 | 1640 / 1866 | 0 / 0 |
| 100 | 80.8 | 76.0 | -6% | 1040.0 / 2090.0 | 1220.0 / 1790.0 | 1346 / 1662 | 0 / 0 |

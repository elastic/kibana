---
navigation_title: Performance journeys
---

# Performance journey testing [performance-journey-testing]

Performance journey tests help us understand the scalability of Kibana APIs and the responsiveness of end-user experiences. They are run on dedicated bare-metal CI infrastructure so that results are stable and comparable over time, and the metrics they emit (APM + EBT) feed dashboards used to catch regressions on `main`.

There are two complementary flavors of journey, plus a guide for running them against Elastic Cloud:

- [Write single-user performance journeys](./write-single-user-performance-journey.md) — browser-driven journeys that mimic a single end-user's flow through Kibana (powered by `kbn-journeys` and Playwright). Use these to track UI/feature performance over time.
- [Write API capacity journeys](./write-api-capacity-testing-journey.md) — load-model-driven journeys that ramp concurrent requests against a single API endpoint to find its breaking point and measure requests-per-second at defined response-time thresholds.
- [Run performance journeys in Cloud](./running-performance-journey-in-cloud.md) — how to point a single-user journey at an Elastic Cloud deployment instead of a local stack.

If you're new to journey tests, start with single-user journeys and read about [adding custom performance metrics](../tutorials/adding-performance-metrics.md) so the data your journey emits is meaningful.
